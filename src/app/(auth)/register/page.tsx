"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSignup } from "@/src/hooks/useSignup";
import { SignupFormData } from "@/src/types/form";
import AuthInput from "@/src/components/AuthInput";
import { validation } from "@/src/utils/validation";
import { Button } from "@/src/components/ui/button";
import AuthLayout from "@/src/components/AuthLayout";
import { ChangeEvent, FormEvent, useState } from "react";
import { Confirmation } from "@/src/components/modal/ConfirmationModal";

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations("auth.SignUpPage");
  const [error, setError] = useState<
    Partial<Record<keyof SignupFormData, string>>
  >({});
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    confirm: string;
    isOpen: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    title: "",
    message: "",
    confirm: "",
    isOpen: false,
  });
  const [data, setData] = useState<SignupFormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof SignupFormData;
    let value = e.target.value;

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setData((previous) => ({
      ...previous,
      [name]: value,
    }));

    const fieldError = validation({
      [name]: value,
    });

    setError((previous) => ({
      ...previous,
      [name]: fieldError[name],
    }));

    // setMessage("");
    setSubmitError("");
  };

  const signupMutation = useSignup();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // setMessage("");
    setSubmitError("");

    const validationErrors = validation(data);
    setError(validationErrors);

    const hasErrors = Object.values(validationErrors).some(Boolean);
    const hasEmptyFields = Object.values(data).some((value) => !value.trim());

    if (hasErrors || hasEmptyFields) return;

    setLoading(true);
    try {
      await signupMutation.mutateAsync(data);

      setData({
        name: "",
        email: "",
        phone: "",
        password: "",
      });
      setError({});

      // Successfully registered, replace route to /login
      router.replace("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";

      //   setSubmitError(message);

      setModalConfig({
        isOpen: true,
        title: t("registrationFailed"),
        confirm: t("ok"),
        message,
      });
    } finally {
      setLoading(false);
    }
  };
  const valid =
    Object.values(data).some((value) => !value.trim()) ||
    Object.values(error).some(Boolean) ||
    loading;

  return (
    <AuthLayout
      title={t("title")}
      footer={
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-1 text-center text-sm text-gray sm:mt-6">
          <span className="text-gray">{t("alreadyHaveAccount")}</span>
          <Link
            href="/login"
            className="font-medium text-chart-5 underline-offset-4 hover:underline"
          >
            {t("goToLogin")}
          </Link>
        </p>
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
          id="name"
          name="name"
          type="text"
          value={data.name}
          error={error.name}
          autoComplete="name"
          label={t("nameLabel")}
          onChange={handleChange}
          placeholder={t("namePlaceholder")}
        />

        <AuthInput
          id="phone"
          type="tel"
          name="phone"
          maxLength={10}
          autoComplete="tel"
          value={data.phone}
          inputMode="numeric"
          error={error.phone}
          label={t("phoneLabel")}
          onChange={handleChange}
          placeholder={t("phonePlaceholder")}
        />

        <AuthInput
          id="email"
          name="email"
          type="email"
          value={data.email}
          error={error.email}
          autoComplete="email"
          label={t("emailLabel")}
          onChange={handleChange}
          placeholder={t("emailPlaceholder")}
        />

        <AuthInput
          id="password"
          type="password"
          name="password"
          value={data.password}
          error={error.password}
          onChange={handleChange}
          label={t("passwordLabel")}
          autoComplete="new-password"
          placeholder={t("passwordPlaceholder")}
        />

        <Button
          type="submit"
          disabled={valid}
          className="h-11 w-full cursor-pointer rounded-lg bg-chart-5 font-medium shadow-none hover:bg-chart-5 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-90"
        >
          {loading ? (
            <>
              {" "}
              {t("signingUp")}
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white-30 border-t-white" />
            </>
          ) : (
            t("signupButton")
          )}
        </Button>
      </form>
      <Confirmation
        loading={loading}
        title={modalConfig.title}
        isOpen={modalConfig.isOpen}
        message={modalConfig.message}
        confirm={modalConfig.confirm}
        onCancel={() =>
          setModalConfig((previous) => ({
            ...previous,
            isOpen: false,
          }))
        }
        onConfirm={modalConfig.onConfirm}
      />
    </AuthLayout>
  );
}
