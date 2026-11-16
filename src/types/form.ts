import { ChangeEvent, ReactNode } from "react";

export type { SignupFormData, LoginFormData } from "../schemas/auth";
export type AuthInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  maxLength?: number;
  placeholder: string;
  autoComplete?: string;
  type: "text" | "email" | "tel" | "password";
  inputMode?: "text" | "numeric" | "email" | "tel";
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export type AuthLayoutProps = {
  title: string;
  footer: ReactNode;
  children: ReactNode;
};
