import { MessageCircleText } from "lucide-react";
import { useTranslations } from "next-intl";

const AuthBrand = () => {
  const t = useTranslations("auth.AuthBrand");
  return (
    <section className="flex w-full flex-1 basis-0 flex-col items-center justify-center px-5 py-7 sm:py-9 md:px-6 lg:px-10">
      <div className="flex items-center gap-2" aria-label="Talkhub">
        <MessageCircleText
          className="h-8 w-8 shrink-0 text-chart-4 sm:h-10 sm:w-10"
          strokeWidth={1.8}
        />

        <h1 className="text-2xl font-bold tracking-tight text-chart-4 sm:text-3xl">
          Talkhub
        </h1>
      </div>

      <p className="mt-2 text-center text-xs text-chart-4 sm:text-sm">
        {t("tagline")}
      </p>
    </section>
  );
};
export default AuthBrand;
