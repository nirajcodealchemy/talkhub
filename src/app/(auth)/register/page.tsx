"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useSignup } from "@/src/hooks/useSignup";
import AuthInput from "@/src/components/AuthInput";
import { validation } from "@/src/utils/validation";
import AuthLayout from "@/src/components/AuthLayout";
import { ChangeEvent, FormEvent, useState } from "react";
import { Confirmation } from "@/src/components/modal/ConfirmationModal";
import { SignupFormData } from "@/src/types/form";

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
      console.log(data);
      const result = await signupMutation.mutateAsync(data);

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
          label={t("nameLabel")}
          type="text"
          value={data.name}
          onChange={handleChange}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          error={error.name}
        />

        <AuthInput
          id="phone"
          name="phone"
          label={t("phoneLabel")}
          type="tel"
          value={data.phone}
          onChange={handleChange}
          placeholder={t("phonePlaceholder")}
          autoComplete="tel"
          inputMode="numeric"
          maxLength={10}
          error={error.phone}
        />

        <AuthInput
          id="email"
          name="email"
          label={t("emailLabel")}
          type="email"
          value={data.email}
          onChange={handleChange}
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
          error={error.email}
        />

        <AuthInput
          id="password"
          name="password"
          type="password"
          label={t("passwordLabel")}
          value={data.password}
          error={error.password}
          onChange={handleChange}
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
        title={modalConfig.title}
        message={modalConfig.message}
        confirm={modalConfig.confirm}
        isOpen={modalConfig.isOpen}
        loading={loading}
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
