"use client";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import { createClient } from "@/src/lib";
import MessageInput from "./MessageInput";
import ReactMarkdown from "react-markdown";
import GroupInfoPanel from "./GroupInfoPanel";
import AddMembersPanel from "./AddMembersPanel";
import { Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage, ChatWindowProps } from "@/src/types";
import { useEditMessage, useTypingIndicator, useUsers } from "@/src/hooks";

type AICacheData = {
  suggestions: string[];
  summary: string;
};

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
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [activeAiPanel, setActiveAiPanel] = useState<AIAction | null>(null);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null,
  );
  const { isOtherUserTyping, notifyTyping, stopTyping } = useTypingIndicator(
    conversation.id,
    currentUserId,
  );

  const aiCache = useRef<Map<string, AICacheData>>(new Map());

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
    const cacheKey = `${conversation.id}-${action}`;

    // 1. Check cache first
    const cachedData = aiCache.current.get(cacheKey);

    if (cachedData) {
      setActiveAiPanel(action);
      setAiError(null);

      if (action === "reply") {
        setAiSuggestions(cachedData.suggestions);
      } else {
        setAiSummary(cachedData.summary);
      }

      setIsAiLoading(false);
      return;
    }

    // 2. No cache found, generate a new response
    setActiveAiPanel(action);
    setAiSuggestions([]);
    setAiSummary("");
    setAiError(null);
    setIsAiLoading(true);

    try {
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

      // 3. Format messages
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

      // 4. Call Gemini API through Next.js API route
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

      const result = await response.json().catch(() => null);

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

      // 5. Save response and update UI
      if (action === "reply") {
        const suggestions = result?.suggestions ?? [];

        setAiSuggestions(suggestions);

        aiCache.current.set(cacheKey, {
          suggestions,
          summary: "",
        });
      } else {
        const summary = result?.summary ?? "";

        setAiSummary(summary);

        aiCache.current.set(cacheKey, {
          suggestions: [],
          summary,
        });
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
          key={conversation.id}
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
          <div className="mx-3 mb-2 max-h-60 shrink-0 rounded-lg border overflow-y-auto border-border bg-background shadow-sm overscroll-contain chat-scrollbar">
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

            <div className="space-y-2 p-2 ">
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
                  // <p className="whitespace-pre-wrap px-2 py-2 text-sm leading-relaxed">
                  //   {aiSummary}
                  // </p>
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="mb-2 text-base font-semibold">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mb-2 mt-3 text-sm font-semibold">
                            {children}
                          </h2>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-foreground">
                            {children}
                          </strong>
                        ),
                        p: ({ children }) => (
                          <p className="mb-2 text-sm leading-6">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="ml-5 list-disc space-y-1">
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm leading-6">{children}</li>
                        ),
                      }}
                    >
                      {aiSummary}
                    </ReactMarkdown>
                  </div>
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
          className="absolute inset-0 z-40 bg-background lg:relative lg:inset-auto lg:z-auto lg:h-full lg:w-100 lg:min-w-100 lg:max-w-100 lg:shrink-0
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
