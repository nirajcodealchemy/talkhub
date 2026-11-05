"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { AuthInputProps } from "../types/form";
import { Button } from "@/components/ui/button";

const AuthInput = ({
  id,
  name,
  type,
  label,
  value,
  error,
  onChange,
  inputMode,
  maxLength,
  placeholder,
  autoComplete,
}: AuthInputProps) => {
  const t = useTranslations("auth.AuthInput");
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  const inputClass =
    "h-12 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none shadow-none transition placeholder:text-gray-400 focus-visible:border-chart-2 focus-visible:ring-2 focus-visible:ring-primary/20 focused:bg-primary-light  sm:px-4";
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 cursor-pointer block text-sm font-medium text-grey-700"
      >
        {label}
      </label>

      <div className="relative">
        <Input
          id={id}
          name={name}
          value={value}
          type={inputType}
          onChange={onChange}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass} ${isPassword ? "pr-12" : ""}`}
        />

        {isPassword && (
          <Button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-pressed={showPassword}
            className="absolute cursor-pointer right-3 bg-transparent hover:bg-transparent top-1/2 -translate-y-1/2 rounded p-1 text-grey-color transition hover:text-chart-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chart-2"
          >
            {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
          </Button>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
export default AuthInput;
