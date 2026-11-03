import {
  Geist,
  Geist_Mono,
  Public_Sans,
  Instrument_Sans,
} from "next/font/google";

import type { ReactNode } from "react";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import QueryProvider from "../providers/QueryProvider";
import { cn } from "@/lib/utils";

const instrumentSansHeading = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html
      lang="en"
      className={cn(
        "antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
        publicSans.variable,
        instrumentSansHeading.variable,
      )}
    >
      <body>
        <QueryProvider>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
