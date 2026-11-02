import { z } from "zod";

export const groupCreateSchema = z.object({
  title: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(50, "Group name must be at most 50 characters"),
  memberIds: z
    .array(z.string().uuid("Invalid user ID"))
    .min(1, "Select at least one member"),
});

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;

export const addGroupMemberSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  userId: z.string().uuid("Invalid user ID"),
});

export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;

export const removeGroupMemberSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  userId: z.string().uuid("Invalid user ID"),
});

export type RemoveGroupMemberInput = z.infer<typeof removeGroupMemberSchema>;
