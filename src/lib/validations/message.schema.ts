import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long")
    .optional(),
  messageType: z.enum(["text", "image", "file"]).default("text"),
  attachmentPath: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentMimeType: z.string().optional(),
  attachmentSizeBytes: z.number().int().positive().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const attachmentSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "File size must be less than 10MB",
    ),
});
