"use client";

import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

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

export function useCreateGroupConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createGroupConversation"],

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

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSearchUsers() {
  const supabase = createClient();

  return useMutation({
    mutationKey: ["searchUsers"],
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.rpc("search_chat_users", {
        p_query: query,
      });

      if (error) throw error;
      return data;
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
      // const { data: deletions, error: deletionError } = await supabase
      //   .from("message_deletions")
      //   .select("message_id")
      //   .eq("user_id", user.id);

      // if (deletionError) throw deletionError;

      // const hiddenIds = (deletions ?? []).map(
      //   (deletion) => deletion.message_id,
      // );

      // let request = supabase
      //   .from("messages")
      //   .select("*")
      //   .eq("conversation_id", conversationId)
      //   .order("created_at", { ascending: false })
      //   .limit(PAGE_SIZE);

      // if (pageParam) {
      //   request = request.lt("created_at", pageParam);
      // }

      // if (hiddenIds.length > 0) {
      //   request = request.not("id", "in", `(${hiddenIds.join(",")})`);
      // }

      // const { data, error } = await request;

      // if (error) throw error;

      // const messages = [...(data ?? [])].reverse();

      // return Promise.all(
      //   messages.map(async (message) => {
      //     if (!message.attachment_path) {
      //       return {
      //         ...message,
      //         attachment_url: null,
      //       };
      //     }

      //     const { data: signedData, error: signedError } =
      //       await supabase.storage
      //         .from("chat-attachments")
      //         .createSignedUrl(message.attachment_path, 3600);

      //     if (signedError) {
      //       console.error("Signed URL error:", signedError);
      //     }

      //     return {
      //       ...message,
      //       attachment_url: signedData?.signedUrl ?? null,
      //     };
      //   }),
      // );

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
              deleted_for_me: deletedForMe,
              attachment_url: null,
            };
          }

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("chat-attachments")
              .createSignedUrl(message.attachment_path, 3600);

          if (signedError) {
            console.error("Signed URL error:", signedError);
          }

          return {
            ...message,
            deleted_for_me: deletedForMe,
            attachment_url: signedData?.signedUrl ?? null,
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
      messageType?: "text" | "image" | "file";
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
        conversation_id: variables.conversationId,
        sender_id: user?.id ?? "",
        content: variables.content,
        message_type: variables.messageType || "text",
        created_at: new Date().toISOString(),
        attachment_url: null,
        attachment_path: null,
        attachment_name: null,
        delivered_at: null,
        read_at: null,
        status: "sending",
        reactions: [],
        reply_count: 0,
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
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // Set UUID version 4 and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
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
