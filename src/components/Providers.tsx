"use client";

import { I18nProvider } from "@/lib/i18n";
import { Suspense } from "react";
import InviteProcessor from "./InviteProcessor";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <Suspense>
        <InviteProcessor />
      </Suspense>
      {children}
    </I18nProvider>
  );
}
