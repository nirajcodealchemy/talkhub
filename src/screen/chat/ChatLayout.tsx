import type { ReactNode } from "react";

type ChatLayoutProps = {
  children: ReactNode;
};

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <main className="fixed inset-0 flex h-dvh w-full overflow-hidden bg-white">
      {children}
    </main>
  );
}
