import { create } from "zustand";
import { ChatConversation } from "@/src/types/chat";

interface ChatState {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  isCreateGroupOpen: boolean;
  isSearchUsersOpen: boolean;
  setConversations: (conversations: ChatConversation[]) => void;
  setSelectedConversationId: (id: string | null) => void;
  addConversation: (conversation: ChatConversation) => void;
  updateConversation: (id: string, updates: Partial<ChatConversation>) => void;
  removeConversation: (id: string) => void;
  setCreateGroupOpen: (open: boolean) => void;
  setSearchUsersOpen: (open: boolean) => void;
  markAsRead: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  isCreateGroupOpen: false,
  isSearchUsersOpen: false,
  setConversations: (conversations) => set({ conversations }),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),
  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv,
      ),
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== id),
    })),
  setCreateGroupOpen: (open) => set({ isCreateGroupOpen: open }),
  setSearchUsersOpen: (open) => set({ isSearchUsersOpen: open }),
  markAsRead: (id) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, unread_count: 0 } : conv,
      ),
    })),
}));
