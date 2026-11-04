"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLogin } from "@/src/hooks/useLogin";
import AuthInput from "@/src/components/AuthInput";
import { loginValidation } from "@/src/utils/validation";
import AuthLayout from "@/src/components/AuthLayout";
import { ChangeEvent, FormEvent, useState } from "react";
import { LoginFormData } from "@/src/types/form";

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [loading, setLoading] = useState(false);
  const t = useTranslations("auth.LoginPage");

  const [data, setData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [error, setError] = useState<
    Partial<Record<keyof LoginFormData, string>>
  >({});

  const [submitError, setSubmitError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof LoginFormData;
    const value = e.target.value;

    setData((previous) => ({
      ...previous,
      [name]: value,
    }));

    const fieldError = loginValidation({
      [name]: value,
    });

    setError((previous) => ({
      ...previous,
      [name]: fieldError[name],
    }));

    setSubmitError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSubmitError("");

    const validationErrors = loginValidation(data);
    setError(validationErrors);

    const hasErrors = Object.values(validationErrors).some(Boolean);
    const hasEmptyFields = Object.values(data).some((value) => !value.trim());

    if (hasErrors || hasEmptyFields) return;

    setLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        email: data.email.trim(),
        password: data.password,
      });

      if (result?.user) {
        router.push("/chat");
      }
    } catch (err: unknown) {
      console.error(t("loginFailed"), err);

      setSubmitError(err instanceof Error ? err.message : t("message"));
    } finally {
      setLoading(false);
    }
  };

  const valid =
    Object.values(data).some((value) => !value.trim()) ||
    !!error.email ||
    !!error.password ||
    loading;

  return (
    <AuthLayout
      title={t("title")}
      footer={
        <div className="mt-5 space-y-4 sm:mt-6">
          <p className="flex flex-wrap items-center justify-center gap-x-1 text-center text-sm text-gray">
            <span>{t("noAccount")}</span>
            <Link
              href="/register"
              className="font-medium text-chart-5 underline-offset-4 hover:underline"
            >
              {t("createAccount")}
            </Link>
          </p>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 sm:space-y-5"
      >
        {submitError && (
          <p
            role="alert"
            className="rounded-lg bg-light-red p-3 text-sm text-destructive"
          >
            {submitError}
          </p>
        )}

        <AuthInput
          id="email"
          name="email"
          type="email"
          label={t("emailLabel")}
          value={data.email}
          error={error.email}
          autoComplete="email"
          onChange={handleChange}
          placeholder={t("emailPlaceholder")}
        />

        <AuthInput
          id="password"
          name="password"
          type="password"
          label={t("passwordLabel")}
          value={data.password}
          error={error.password}
          onChange={handleChange}
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
        />
        <div className="text-right">
          <Button className="text-sm font-medium bg-background text-chart-3 hover:bg-background cursor-not-allowed">
            {t("forgotPassword")}
          </Button>
        </div>

        <Button
          type="submit"
          disabled={valid}
          className="h-11 w-full cursor-pointer rounded-lg bg-chart-4 font-medium text-background shadow-none hover:bg-chart-5 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-90"
        >
          {loading ? (
            <>
              {" "}
              {t("Logging")}{" "}
              <span className="h-5 w-5 animate-spin rounded-full  border-2 border-ring border-t-background" />
            </>
          ) : (
            t("title")
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
