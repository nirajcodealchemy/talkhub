// import { useQuery } from "@tanstack/react-query";
// import { createClient } from "../lib/supabase/client";

// export function useMessages(conversationId: string) {
//   const supabase = createClient();

//   return useQuery({
//     queryKey: ["messages", conversationId],

//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from("messages")
//         .select("*")
//         .eq("conversation_id", conversationId)
//         .order("created_at", { ascending: true });

//       if (error) throw error;

//       // Generate signed URLs for attachments
//       const messagesWithAttachments = await Promise.all(
//         (data ?? []).map(async (message) => {
//           if (!message.attachment_path) {
//             return {
//               ...message,
//               attachment_url: null,
//             };
//           }

//           const { data: signedData, error: signedError } =
//             await supabase.storage
//               .from("chat-attachments")
//               .createSignedUrl(message.attachment_path, 3600);

//           if (signedError) {
//             console.error("Signed URL error:", signedError);
//           }

//           return {
//             ...message,
//             attachment_url: signedData?.signedUrl ?? null,
//           };
//         }),
//       );

//       return messagesWithAttachments;
//     },

//     enabled: !!conversationId,
//   });
// }
