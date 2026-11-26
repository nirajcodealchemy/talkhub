"use client";

import { createClient } from "@/src/lib";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { ChatMessage } from "../types";

export function useCreateDirectConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createDirectConversation"],
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc("create_direct_conversation", {
        p_other_user_id: otherUserId,
      });

      if (error) throw error;
      return data as string;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSearchUsers(query: string, enabled = true) {
  const supabase = createClient();

  return useInfiniteQuery({
    queryKey: ["searchUsers", query],
    enabled: enabled && (query.trim().length === 0 || query.trim().length >= 2),

    initialPageParam: 0,

    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("search_chat_users", {
        p_query: query.trim(),
        p_limit: 10,
        p_offset: pageParam,
      });

      if (error) throw error;

      return data ?? [];
    },

    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 10) return undefined;

      return allPages.reduce((total, page) => total + page.length, 0);
    },
  });
}

export function useMessages(conversationId: string) {
  const supabase = createClient();
  const PAGE_SIZE = 15;

  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    initialPageParam: null as string | null,

    queryFn: async ({ pageParam }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in.");
      }

      // Get messages hidden by this user.
      const { data: deletions, error: deletionError } = await supabase
        .from("message_deletions")
        .select("message_id")
        .eq("user_id", user.id);

      if (deletionError) throw deletionError;

      const hiddenIds = new Set(
        (deletions ?? []).map((deletion) => deletion.message_id),
      );

      let request = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        request = request.lt("created_at", pageParam);
      }

      const { data, error } = await request;

      if (error) throw error;

      const messages = [...(data ?? [])].reverse();

      // Get unique sender IDs from the current message page.
      const senderIds = [
        ...new Set(messages.map((message) => message.sender_id)),
      ];

      // Fetch all sender profiles in one request.
      const { data: senderProfiles, error: senderError } = senderIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", senderIds)
        : { data: [], error: null };

      if (senderError) throw senderError;

      // Create sender lookup map.
      const senderMap = new Map(
        (senderProfiles ?? []).map((profile) => [profile.id, profile]),
      );

      // Load the original messages referenced by replies on this page.
      const replyIds = [
        ...new Set(
          messages
            .map((message) => message.reply_to_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const { data: repliedMessages, error: replyError } = replyIds.length
        ? await supabase.from("messages").select("*").in("id", replyIds)
        : { data: [], error: null };

      if (replyError) throw replyError;

      const replySenderIds = [
        ...new Set((repliedMessages ?? []).map((message) => message.sender_id)),
      ];

      const { data: replySenderProfiles, error: replySenderError } =
        replySenderIds.length
          ? await supabase
              .from("profiles")
              .select("id, full_name, username, avatar_url")
              .in("id", replySenderIds)
          : { data: [], error: null };

      if (replySenderError) throw replySenderError;

      const replySenderMap = new Map(
        (replySenderProfiles ?? []).map((profile) => [profile.id, profile]),
      );

      const replyMessagesWithUrls = await Promise.all(
        (repliedMessages ?? []).map(async (message) => {
          let attachmentUrl: string | null = null;

          if (
            message.attachment_path &&
            !message.is_deleted_for_everyone &&
            !hiddenIds.has(message.id)
          ) {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("chat-attachments")
                .createSignedUrl(message.attachment_path, 3600);

            if (signedError) {
              console.error(
                "Replied attachment signed URL error:",
                signedError,
              );
            }

            attachmentUrl = signedData?.signedUrl ?? null;
          }

          return {
            ...message,
            attachment_url: attachmentUrl,
            sender_profile: replySenderMap.get(message.sender_id) ?? null,
          };
        }),
      );

      const replyMessageMap = new Map(
        replyMessagesWithUrls.map((message) => [message.id, message]),
      );

      return Promise.all(
        messages.map(async (message) => {
          const deletedForMe = hiddenIds.has(message.id);

          if (
            !message.attachment_path ||
            message.is_deleted_for_everyone ||
            deletedForMe
          ) {
            return {
              ...message,
              sender_profile: senderMap.get(message.sender_id) ?? null,
              deleted_for_me: deletedForMe,
              attachment_url: null,
              reply_to_message: message.reply_to_id
                ? (replyMessageMap.get(message.reply_to_id) ?? null)
                : null,
            };
            // return {
            //   ...message,
            //   deleted_for_me: deletedForMe,
            //   attachment_url: null,
            // };
          }

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("chat-attachments")
              .createSignedUrl(message.attachment_path, 3600);

          if (signedError) {
            console.error("Signed URL error:", signedError);
          }

          // return {
          //   ...message,
          //   deleted_for_me: deletedForMe,
          //   attachment_url: signedData?.signedUrl ?? null,
          // };
          return {
            ...message,
            sender_profile: senderMap.get(message.sender_id) ?? null,
            deleted_for_me: deletedForMe,
            attachment_url: signedData?.signedUrl ?? null,
            reply_to_message: message.reply_to_id
              ? (replyMessageMap.get(message.reply_to_id) ?? null)
              : null,
          };
        }),
      );
    },

    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;

      return lastPage[0]?.created_at;
    },

    enabled: !!conversationId,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSendMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["sendMessage"],

    mutationFn: async (message: {
      conversationId: string;
      content: string;
      messageType?: "text" | "image" | "file" | "sticker";
      replyToId?: string | null;
      stickerUrl?: string | null;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to send messages.");
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: message.conversationId,
          sender_id: user.id,
          content: message.content,
          message_type: message.messageType || "text",
          reply_to_id: message.replyToId ?? null,
          sticker_url: message.stickerUrl ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onMutate: async (variables) => {
      const queryKey = ["messages", variables.conversationId];

      await queryClient.cancelQueries({ queryKey });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const tempId = generateTempId();

      const optimisticMessage = {
        id: tempId,
        read_at: null,
        reactions: [],
        reply_count: 0,
        status: "sending",
        delivered_at: null,
        attachment_url: null,
        attachment_path: null,
        attachment_name: null,
        sticker_url: variables.stickerUrl ?? null,
        sender_id: user?.id ?? "",
        content: variables.content,
        created_at: new Date().toISOString(),
        reply_to_id: variables.replyToId ?? null,
        conversation_id: variables.conversationId,
        message_type: variables.messageType || "text",
      };

      queryClient.setQueryData(queryKey, (old: any) => {
        // Initialize the infinite-query cache if it doesn't exist.
        if (!old?.pages?.length) {
          return {
            pages: [[optimisticMessage]],
            pageParams: [null],
          };
        }

        return {
          ...old,
          pages: [
            ...old.pages.map((page: any[], index: number) =>
              index === 0 ? [...page, optimisticMessage] : page,
            ),
          ],
        };
      });

      return { tempId, queryKey };
    },

    onSuccess: (data, variables, context) => {
      if (!context) return;

      queryClient.setQueryData(context.queryKey, (old: any) => {
        if (!old?.pages?.length) {
          return {
            pages: [[{ ...data, attachment_url: null }]],
            pageParams: [null],
          };
        }

        let replaced = false;

        const pages = old.pages.map((page: any[]) =>
          page.map((message) => {
            if (message.id === context.tempId) {
              replaced = true;
              return { ...data, attachment_url: null };
            }

            return message;
          }),
        );

        // Avoid duplicates if Realtime already inserted the server message.
        const alreadyExists = pages.some((page: any[]) =>
          page.some((message) => message.id === data.id),
        );

        if (!replaced && !alreadyExists) {
          pages[0] = [...pages[0], { ...data, attachment_url: null }];
        }

        return { ...old, pages };
      });
    },

    onError: (error, variables, context) => {
      console.error("Message sending failed:", error);

      if (!context) return;

      queryClient.setQueryData(context.queryKey, (old: any) => {
        if (!old?.pages?.length) return old;

        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.filter((message) => message.id !== context.tempId),
          ),
        };
      });
    },
  });
}

export function useSendAttachment() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["sendAttachment"],

    mutationFn: async ({
      conversationId,
      file,
      caption = "",
    }: {
      conversationId: string;
      file: File;
      caption?: string;
    }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to send attachments.");
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const randomId = Array.from(
        crypto.getRandomValues(new Uint8Array(16)),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");

      const filePath = `${conversationId}/${user.id}/${randomId}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      const isImage = file.type.startsWith("image/");

      const { data, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: isImage ? caption.trim() : file.name,
          message_type: isImage ? "image" : "file",
          attachment_path: filePath,
          attachment_name: file.name,
          attachment_type: file.type,
          attachment_size: file.size,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from("chat-attachments").remove([filePath]);

        throw insertError;
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
        exact: true,
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}

function generateGroupId(): string {
  // if (typeof crypto.randomUUID === "function") {
  //   return crypto.randomUUID();
  // }

  // const bytes = crypto.getRandomValues(new Uint8Array(16));

  // // Set UUID version 4 and variant bits.
  // bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // const hex = Array.from(bytes, (byte) =>
  //   byte.toString(16).padStart(2, "0"),
  // ).join("");

  // return [
  //   hex.slice(0, 8),
  //   hex.slice(8, 12),
  //   hex.slice(12, 16),
  //   hex.slice(16, 20),
  //   hex.slice(20),
  // ].join("-");
  return crypto.randomUUID();
}

export function useSendImageGroup() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["sendImageGroup"],

    mutationFn: async ({
      conversationId,
      files,
      caption = "",
    }: {
      conversationId: string;
      files: File[];
      caption?: string;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to send images.");
      }

      if (files.length === 0) {
        throw new Error("Select at least one image.");
      }

      const mediaGroupId = generateGroupId();

      const uploadedPaths: string[] = [];

      try {
        const rows = await Promise.all(
          files.map(async (file, index) => {
            const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

            const randomId = Array.from(
              crypto.getRandomValues(new Uint8Array(16)),
              (byte) => byte.toString(16).padStart(2, "0"),
            ).join("");

            const filePath = `${conversationId}/${user.id}/${randomId}-${safeFileName}`;

            const { error: uploadError } = await supabase.storage
              .from("chat-attachments")
              .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type || "application/octet-stream",
              });

            if (uploadError) throw uploadError;

            uploadedPaths.push(filePath);

            return {
              conversation_id: conversationId,
              sender_id: user.id,
              content: index === 0 ? caption.trim() : "",
              message_type: "image",
              attachment_path: filePath,
              attachment_name: file.name,
              attachment_type: file.type,
              attachment_size: file.size,
              media_group_id: mediaGroupId,
            };
          }),
        );

        const { data, error } = await supabase
          .from("messages")
          .insert(rows)
          .select();

        if (error) throw error;

        return data;
      } catch (error) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from("chat-attachments").remove(uploadedPaths);
        }

        throw error;
      }
    },

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
        exact: true,
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}

export function useCreateGroupConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      memberIds,
    }: {
      title: string;
      memberIds: string[];
    }) => {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        p_title: title,
        p_member_ids: memberIds,
      });

      if (error) throw error;

      return data as string;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}

export function useLeaveGroupConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.rpc("leave_group_conversation", {
        p_conversation_id: conversationId,
      });

      if (error) throw error;
      return data;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}

export function useDeleteGroupConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.rpc("delete_group_conversation", {
        p_conversation_id: conversationId,
      });

      if (error) throw error;
      return data;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}

// export function useAddGroupMembers() {
//   const supabase = createClient();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async ({
//       conversationId,
//       memberIds,
//     }: {
//       conversationId: string;
//       memberIds: string[];
//     }) => {
//       const { data, error } = await supabase.rpc("add_group_members", {
//         p_conversation_id: conversationId,
//         p_member_ids: memberIds,
//       });

//       if (error) throw error;

//       return data;
//     },

//     onSuccess: async (_, variables) => {
//       await Promise.all([
//         queryClient.invalidateQueries({
//           queryKey: ["conversations"],
//         }),
//         queryClient.invalidateQueries({
//           queryKey: ["messages", variables.conversationId],
//         }),
//       ]);
//     },
//   });
// }

export function useAddGroupMembers() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      memberIds,
    }: {
      conversationId: string;
      memberIds: string[];
    }) => {
      const { data, error } = await supabase.rpc("add_group_members", {
        p_conversation_id: conversationId,
        p_member_ids: memberIds,
      });

      if (error) throw error;

      return data;
    },

    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["conversations"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["messages", variables.conversationId],
        }),
      ]);
    },
  });
}

export function usePromoteGroupMember() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      memberId,
    }: {
      conversationId: string;
      memberId: string;
    }) => {
      const { data, error } = await supabase.rpc("promote_group_member", {
        p_conversation_id: conversationId,
        p_member_id: memberId,
      });

      if (error) throw error;
      return data;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}

export function useBanGroupMember() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      memberId,
    }: {
      conversationId: string;
      memberId: string;
    }) => {
      const { data, error } = await supabase.rpc("ban_group_member", {
        p_conversation_id: conversationId,
        p_member_id: memberId,
      });

      if (error) throw error;
      return data;
    },

    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({
          queryKey: ["bannedGroupMembers", variables.conversationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["messages", variables.conversationId],
        }),
      ]);
    },
  });
}

export function useUnbanGroupMember() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      memberId,
    }: {
      conversationId: string;
      memberId: string;
    }) => {
      const { data, error } = await supabase.rpc("unban_group_member", {
        p_conversation_id: conversationId,
        p_member_id: memberId,
      });

      if (error) throw error;
      return data;
    },

    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({
          queryKey: ["bannedGroupMembers", variables.conversationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["messages", variables.conversationId],
        }),
      ]);
    },
  });
}

export function useBannedGroupMembers(conversationId: string, enabled = true) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["bannedGroupMembers", conversationId],

    queryFn: async () => {
      const { data: bannedRows, error: bannedError } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .eq("is_banned", true);

      if (bannedError) throw bannedError;

      const bannedIds = (bannedRows ?? []).map((row) => row.user_id);

      if (bannedIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", bannedIds);

      if (profilesError) throw profilesError;

      return profiles ?? [];
    },

    enabled: enabled && !!conversationId,
    staleTime: 30_000,
  });
}

export function useForwardMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["forwardMessage"],

    mutationFn: async ({
      targetConversationId,
      originalMessage,
    }: {
      targetConversationId: string;
      originalMessage: ChatMessage;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to forward messages.");
      }

      // if (originalMessage.message_type !== "text") {
      //   throw new Error("Only text messages can be forwarded right now.");
      // }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: targetConversationId,
          sender_id: user.id,
          content: originalMessage.content,
          message_type: originalMessage.message_type ?? "text",
          forwarded_from_id: originalMessage.id,
          attachment_path: originalMessage.attachment_path,
          attachment_name: originalMessage.attachment_name,
          attachment_type: originalMessage.attachment_type,
          attachment_size: originalMessage.attachment_size,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["messages", variables.targetConversationId],
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}
