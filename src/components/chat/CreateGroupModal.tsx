"use client";

import { useState } from "react";
import { X, Users, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useCreateGroupConversation, useSearchUsers } from "@/src/hooks/useChat";
import { groupCreateSchema } from "@/src/lib/validations/group.schema";
import { z } from "zod";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
};

export default function CreateGroupModal({
  isOpen,
  onClose,
  currentUserId,
}: Props) {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null }>
  >([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  const searchUsers = useSearchUsers();
  const createGroup = useCreateGroupConversation();

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchUsers.mutateAsync(searchQuery.trim());
      setSearchResults(results || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  };

  const handleAddUser = (user: any) => {
    if (selectedUsers.find((u) => u.id === user.id)) return;
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleCreate = async () => {
    setError("");
    try {
      const validation = groupCreateSchema.parse({
        title,
        memberIds: selectedUsers.map((u) => u.id),
      });

      await createGroup.mutateAsync({
        title: validation.title,
        memberIds: validation.memberIds,
      });

      setTitle("");
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create group");
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#6545db]" />
            <h2 className="text-lg font-semibold text-gray-900">
              Create Group
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Group Name
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter group name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6545db] focus:outline-none focus:ring-1 focus:ring-[#6545db]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Add Members
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length >= 2) {
                      handleSearch();
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  placeholder="Search users..."
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#6545db] focus:outline-none focus:ring-1 focus:ring-[#6545db]"
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddUser(user)}
                    className="flex w-full items-center gap-2 p-2 hover:bg-gray-50"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-300" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Selected Members ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 rounded-full bg-[#6545db]/10 px-2 py-1"
                  >
                    <span className="text-xs text-[#6545db]">
                      {user.full_name || user.username}
                    </span>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-[#6545db] hover:text-[#5436c2]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={createGroup.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createGroup.isPending || selectedUsers.length === 0 || !title.trim()}
              className="flex-1 bg-[#6545db] hover:bg-[#5436c2]"
            >
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
