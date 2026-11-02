import { z } from "zod";
import { emailRegex, passwordRegex, phoneRegex, userRegex } from "../utils/regex";

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(userRegex, "Name must start with a letter and contain at least 3 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .regex(emailRegex, "Enter valid email"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(phoneRegex, "Phone number must be 10 digits"),
  password: z
    .string()
    .min(1, "Password is required")
    .regex(
      passwordRegex,
      "Must contain at least 8 characters, an uppercase letter, a lowercase letter, and a special character"
    ),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .regex(emailRegex, "Enter valid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .regex(
      passwordRegex,
      "Must contain at least 8 characters, an uppercase letter, a lowercase letter, and a special character"
    ),
});

export const confirmationModalSchema = z.object({
  title: z.string(),
  isOpen: z.boolean(),
  confirm: z.string(),
  loading: z.boolean().optional(),
  message: z.string().optional(),
  onClick: z.custom<(() => void) | undefined>().optional(),
  onCancel: z.custom<(() => void) | undefined>().optional(),
  onConfirm: z.custom<(() => void) | undefined>().optional(),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ConfirmationModalData = z.infer<typeof confirmationModalSchema>;
