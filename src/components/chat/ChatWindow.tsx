"use client";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import { createClient } from "@/src/lib";
import MessageInput from "./MessageInput";
import GroupInfoPanel from "./GroupInfoPanel";
import AddMembersPanel from "./AddMembersPanel";
import { Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage, ChatWindowProps } from "@/src/types";
import { useEditMessage, useTypingIndicator, useUsers } from "@/src/hooks";

export default function ChatWindow({
  onSend,
  onBack,
  onLoadOlder,
  conversation,
  onAttachment,
  onAttachments,
  currentUserId,
  isLoadingOlder,
  hasMoreMessages,
}: ChatWindowProps) {
  const queryClient = useQueryClient();

  type AIAction = "reply" | "summary";

  const supabase = useMemo(() => createClient(), []);

  const [aiSummary, setAiSummary] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [activeAiPanel, setActiveAiPanel] = useState<AIAction | null>(null);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null,
  );

  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);

  const { isOtherUserTyping, notifyTyping, stopTyping } = useTypingIndicator(
    conversation.id,
    currentUserId,
  );

  const { data: users = [], isLoading: isUsersLoading } = useUsers();
  const { mutateAsync: editMessage, isPending: isEditing } = useEditMessage();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditingMessage(null);
    setIsGroupInfoOpen(false);
    setIsAddMembersOpen(false);

    setActiveAiPanel(null);
    setAiSuggestions([]);
    setAiSummary("");
    setAiError(null);
    setSuggestedReply(null);
  }, [conversation.id]);

  const handleEditRequest = (message: ChatMessage) => {
    setEditingMessage(message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleEditSubmit = async (content: string) => {
    if (!editingMessage) return;

    await editMessage({
      messageId: editingMessage.id,
      conversationId: conversation.id,
      content,
    });

    setEditingMessage(null);
  };

  const handleGroupExited = () => {
    setIsGroupInfoOpen(false);
    setIsAddMembersOpen(false);
    onBack?.();
  };

  const handleMembersAdded = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["conversations"],
    });

    setIsAddMembersOpen(false);
    setIsGroupInfoOpen(true);
  };

  const handleAIAction = async (action: AIAction) => {
    setActiveAiPanel(action);
    setAiSuggestions([]);
    setAiSummary("");
    setAiError(null);
    setIsAiLoading(true);

    try {
      // Get messages from the last 48 hours
      const twoDaysAgo = new Date(
        Date.now() - 48 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from("messages")
        .select("content, sender_id, created_at, message_type")
        .eq("conversation_id", conversation.id)
        .eq("message_type", "text")
        .gte("created_at", twoDaysAgo)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      if (!data?.length) {
        throw new Error("No text messages found in the last 48 hours.");
      }

      // Format messages for the AI API
      const formattedMessages = data.map((message) => ({
        sender:
          message.sender_id === currentUserId
            ? "You"
            : conversation.is_group
              ? "Group member"
              : conversation.name,
        content: message.content,
        created_at: message.created_at,
      }));

      // Send messages to the AI API
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: action,
          messages: formattedMessages,
        }),
      });

      // Parse API response
      const result = await response.json().catch(() => null);

      // Handle API errors
      if (!response.ok) {
        console.error("AI API error:", {
          status: response.status,
          response: result,
        });

        throw new Error(
          result?.error ||
            result?.message ||
            `AI request failed with status ${response.status}`,
        );
      }

      // Update UI with AI response
      if (action === "reply") {
        setAiSuggestions(result?.suggestions ?? []);
      } else {
        setAiSummary(result?.summary ?? "");
      }
    } catch (error) {
      console.error("AI generation error:", error);

      setAiError(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the AI response.",
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSuggestedReply(suggestion);
    setActiveAiPanel(null);
  };

  const handleSuggestionApplied = () => {
    setSuggestedReply(null);
  };

  return (
    <div className="relative flex h-full min-h-0 min-w-0 w-full overflow-hidden">
      {/* Main Chat */}
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-window-background">
        <ChatHeader
          onBack={() => onBack?.()}
          conversation={conversation}
          onAIAction={handleAIAction}
          currentUserId={currentUserId}
          onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
        />

        <MessageList
          onLoadOlder={onLoadOlder}
          currentUserId={currentUserId}
          isLoadingOlder={isLoadingOlder}
          messages={conversation.messages}
          hasMoreMessages={hasMoreMessages}
          onEditMessage={handleEditRequest}
          isGroup={!!conversation.is_group}
          isOtherUserTyping={isOtherUserTyping}
        />

        {/* AI Result Panel */}
        {activeAiPanel && (
          <div className="mx-3 mb-2 max-h-60 shrink-0 overflow-y-auto rounded-lg border border-border bg-background shadow-sm">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />

                <h3 className="text-sm font-semibold">
                  {activeAiPanel === "reply"
                    ? "Suggest a reply"
                    : "Conversation summary"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveAiPanel(null)}
                className="rounded-full cursor-pointer p-1 text-muted-foreground hover:bg-accent"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-2 p-2">
              {isAiLoading && (
                <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
                  <Loader2 size={17} className="animate-spin" />
                  Generating...
                </div>
              )}

              {!isAiLoading && aiError && (
                <div className="flex items-center justify-between gap-2 p-2">
                  <p className="text-sm text-destructive">{aiError}</p>

                  <button
                    type="button"
                    onClick={() => handleAIAction(activeAiPanel)}
                    className="text-xs cursor-pointer font-medium text-primary"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isAiLoading &&
                !aiError &&
                activeAiPanel === "reply" &&
                aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full cursor-pointer rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {suggestion}
                  </button>
                ))}

              {!isAiLoading &&
                !aiError &&
                activeAiPanel === "summary" &&
                aiSummary && (
                  <p className="whitespace-pre-wrap px-2 py-2 text-sm leading-relaxed">
                    {aiSummary}
                  </p>
                )}
            </div>
          </div>
        )}
        <MessageInput
          onSend={onSend}
          isEditing={isEditing}
          onTyping={notifyTyping}
          onStopTyping={stopTyping}
          onAttachment={onAttachment}
          onAttachments={onAttachments}
          editingMessage={editingMessage}
          onCancelEdit={handleCancelEdit}
          onEditSubmit={handleEditSubmit}
          suggestedReply={suggestedReply}
          conversationId={conversation.id}
          onSuggestionApplied={handleSuggestionApplied}
          isBanned={
            !!conversation.is_group &&
            !!conversation.group_members?.some(
              (member) => member.id === currentUserId && member.is_banned,
            )
          }
        />
      </section>

      {/* Group Info / Add Members */}
      {conversation.is_group && isGroupInfoOpen && (
        <div
          className="absolute inset-0 z-40 bg-background lg:relative lg:inset-auto lg:z-auto lg:h-full lg:w-[400px] lg:min-w-[400px] lg:max-w-[400px] lg:shrink-0
          "
        >
          {/* Add Members */}
          {isAddMembersOpen ? (
            <AddMembersPanel
              users={users}
              onAdded={handleMembersAdded}
              currentUserId={currentUserId}
              isUsersLoading={isUsersLoading}
              conversationId={conversation.id}
              onBack={() => setIsAddMembersOpen(false)}
              existingMemberIds={
                conversation.group_members?.map((member) => member.id) ?? []
              }
            />
          ) : (
            <GroupInfoPanel
              conversation={conversation}
              currentUserId={currentUserId}
              onGroupExited={handleGroupExited}
              onClose={() => setIsGroupInfoOpen(false)}
              onAddMembers={() => setIsAddMembersOpen(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
