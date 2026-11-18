import {
  Geist,
  Geist_Mono,
  Public_Sans,
  Instrument_Sans,
} from "next/font/google";

import type { ReactNode } from "react";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import QueryProvider from "../providers/QueryProvider";
import { cn } from "@/src/lib/utils";

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

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const messages = await getMessages();

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
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
