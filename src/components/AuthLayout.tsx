import AuthBrand from "./AuthBrand";
import { AuthLayoutProps } from "../types/form";

const AuthLayout = ({ title, children, footer }: AuthLayoutProps) => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-3 py-6 sm:px-6 sm:py-10">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl md:flex-row">
        {/* Branding */}
        <div className="hidden flex-1 basis-0 md:flex">
          <AuthBrand />
        </div>

        {/* Responsive divider */}
        <div
          aria-hidden="true"
          className="mx-auto h-px w-[85%] shrink-0 bg-gradient-to-r from-transparent via-chart-5 to-transparent md:mx-0 md:my-8 md:h-auto md:min-h-[400px] md:w-[3px] md:bg-gradient-to-b"
        />

        {/* Form section */}
        <section className="flex w-full min-w-0 flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 md:w-auto md:flex-1 md:basis-0 lg:px-10">
          <h2 className="mb-6 text-center text-2xl font-semibold text-chart-4 sm:mb-8 sm:text-3xl">
            {title}
          </h2>

          {children}

          {footer}
        </section>
      </div>
    </main>
  );
};
export default AuthLayout;
