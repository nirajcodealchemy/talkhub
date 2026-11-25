"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Send, Users, X } from "lucide-react";
import type { ChatConversation, ChatMessage } from "@/src/types";

type ForwardMessageModalProps = {
  message: ChatMessage | null;
  conversations: ChatConversation[];
  currentConversationId: string;
  isForwarding: boolean;
  onClose: () => void;
  onForward: (
    targetConversationIds: string[],
    message: ChatMessage,
  ) => Promise<void>;
};

export default function ForwardMessageModal({
  message,
  conversations,
  currentConversationId,
  isForwarding,
  onClose,
  onForward,
}: ForwardMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationIds, setSelectedConversationIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery("");
    setSelectedConversationIds([]);
  }, [message?.id]);

  const availableConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conversation) => {
      // if (conversation.id === currentConversationId) return false;

      return !query || conversation.name?.toLowerCase().includes(query);
    });
  }, [conversations, currentConversationId, searchQuery]);

  if (!message) return null;

  const toggleConversation = (conversationId: string) => {
    setSelectedConversationIds((current) =>
      current.includes(conversationId)
        ? current.filter((id) => id !== conversationId)
        : [...current, conversationId],
    );
  };

  const handleForward = async () => {
    if (selectedConversationIds.length === 0 || isForwarding) return;

    await onForward(selectedConversationIds, message);
  };

  const handleCancel = () => {
    setSearchQuery("");
    setSelectedConversationIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-chart-4" />

            <h2 className="text-lg font-semibold text-foreground">
              Forward message
            </h2>
          </div>

          <button
            onClick={handleCancel}
            type="button"
            aria-label="Close forward dialog"
            className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Message Preview */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Message preview
            </p>

            <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-foreground">
              {message.content || "Attachment"}
            </p>
          </div>

          {/* Search Conversations */}
          <div>
            <label
              htmlFor="forward-search"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Select conversations
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="forward-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-chart-4 focus:ring-1 focus:ring-chart-4"
              />
            </div>

            {/* Conversation Results */}
            <div className="chat-scrollbar mt-2 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-border">
              {availableConversations.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  No conversations found
                </p>
              ) : (
                availableConversations.map((conversation) => {
                  const isSelected = selectedConversationIds.includes(
                    conversation.id,
                  );

                  return (
                    <div
                      key={conversation.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => toggleConversation(conversation.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleConversation(conversation.id);
                        }
                      }}
                      className="flex cursor-pointer items-center gap-3 border-b border-border p-3 last:border-0 hover:bg-accent"
                    >
                      {conversation.avatar_url ? (
                        <img
                          src={conversation.avatar_url ?? ""}
                          alt=""
                          className="flex h-9 w-9 rounded-full"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chart-4/10 text-sm font-semibold text-chart-4">
                          {conversation.name?.trim().charAt(0).toUpperCase() ||
                            "?"}
                        </div>
                      )}

                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {conversation.name}
                      </p>

                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? "border-chart-4 bg-chart-4 text-white"
                            : "border-input bg-background text-transparent hover:border-chart-4"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {selectedConversationIds.length} selected
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex h-10 gap-2">
            <button
              onClick={handleCancel}
              type="button"
              className="h-full flex-1 cursor-pointer rounded-lg border border-border text-sm text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>

            <button
              onClick={handleForward}
              type="button"
              disabled={selectedConversationIds.length === 0 || isForwarding}
              className="flex h-full flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-chart-4 text-sm text-white transition-colors hover:bg-chart-5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isForwarding ? "Forwarding..." : "Forward"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
