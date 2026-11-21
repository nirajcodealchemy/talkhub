"use client";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useEffect, useState } from "react";
import GroupInfoPanel from "./GroupInfoPanel";
import AddMembersPanel from "./AddMembersPanel";
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
    setEditingMessage(null);
    setIsGroupInfoOpen(false);
    setIsAddMembersOpen(false);
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

  return (
    <div className="relative flex h-full min-h-0 min-w-0 w-full overflow-hidden">
      {/* Main Chat */}
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-window-background">
        <ChatHeader
          onBack={() => onBack?.()}
          conversation={conversation}
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
          conversationId={conversation.id}
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
          className="
            absolute inset-0 z-40 bg-background
            lg:relative lg:inset-auto lg:z-auto
            lg:h-full lg:w-[400px]
            lg:min-w-[400px] lg:max-w-[400px] lg:shrink-0
          "
        >
          {/* Add Members */}
          {isAddMembersOpen ? (
            <AddMembersPanel
              conversationId={conversation.id}
              users={users}
              existingMemberIds={
                conversation.group_members?.map((member) => member.id) ?? []
              }
              currentUserId={currentUserId}
              onBack={() => setIsAddMembersOpen(false)}
              onAdded={handleMembersAdded}
            />
          ) : (
            <GroupInfoPanel
              conversation={conversation}
              currentUserId={currentUserId}
              onClose={() => setIsGroupInfoOpen(false)}
              onGroupExited={handleGroupExited}
              onAddMembers={() => setIsAddMembersOpen(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
