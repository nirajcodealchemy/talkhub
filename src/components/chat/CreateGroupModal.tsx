"use client";

import { useState } from "react";
import { X, Users, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useSearchUsers } from "@/src/hooks/useChat";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
};

export default function CreateGroupModal({ isOpen, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const searchUsers = useSearchUsers();
  // const createGroup = useCreateGroupConversation();

  const handleSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchUsers.mutateAsync(query.trim());
      setSearchResults(results || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  };

  const handleAddUser = (user: any) => {
    if (selectedUsers.find((u) => u.id === user.id)) return;

    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // const handleCreate = async () => {
  //   setError("");

  //   try {
  //     const validation = groupCreateSchema.parse({
  //       title,
  //       memberIds: selectedUsers.map((u) => u.id),
  //     });

  //     await createGroup.mutateAsync({
  //       title: validation.title,
  //       memberIds: validation.memberIds,
  //     });

  //     setTitle("");
  //     setSelectedUsers([]);
  //     setSearchQuery("");
  //     setSearchResults([]);
  //     onClose();
  //   } catch (err) {
  //     if (err instanceof z.ZodError) {
  //       setError(err.errors[0].message);
  //     } else if (err instanceof Error) {
  //       setError(err.message);
  //     } else {
  //       setError("Failed to create group");
  //     }
  //   }
  // };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-chart-4" />
            <h2 className="text-lg font-semibold text-foreground">
              Create Group
            </h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Close modal"
            className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Group Name
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter group name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-chart-4 focus:ring-1 focus:ring-chart-4"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Add Members
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  handleSearch(value);
                }}
                placeholder="Search users..."
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-chart-4 focus:ring-1 focus:ring-chart-4"
              />
            </div>

            {searchUsers.isPending && (
              <p className="mt-2 text-xs text-muted-foreground">Searching...</p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAddUser(user)}
                    className="flex w-full cursor-pointer items-center gap-2 p-2 transition-colors hover:bg-accent"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted" />

                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">
                        {user.full_name || user.username}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Selected Members ({selectedUsers.length})
              </label>

              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 rounded-full bg-chart-4/10 px-2 py-1"
                  >
                    <span className="text-xs text-chart-4">
                      {user.full_name || user.username}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      aria-label={`Remove ${user.full_name || user.username}`}
                      className="cursor-pointer text-chart-4 transition-colors hover:text-chart-5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 h-10">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 cursor-pointer h-full"
              // disabled={createGroup.isPending}
            >
              Cancel
            </Button>

            <Button
              // onClick={handleCreate}
              disabled={
                // createGroup.isPending ||
                // selectedUsers.length === 0 || !title.trim()
                true
              }
              className="flex-1  h-full bg-chart-4 text-white hover:bg-chart-5 cursor-not-allowed"
            >
              {/* {createGroup.isPending ? "Creating..." : "Create Group"} */}
              Create Group{" "}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
