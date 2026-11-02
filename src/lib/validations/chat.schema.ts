import { z } from "zod";

export const createDirectConversationSchema = z.object({
  otherUserId: z.string().uuid("Invalid user ID"),
});

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;

export const searchUsersSchema = z.object({
  query: z
    .string()
    .min(2, "Search query must be at least 2 characters")
    .max(50, "Search query is too long"),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
