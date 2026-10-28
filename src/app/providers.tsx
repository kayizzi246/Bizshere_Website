"use client";

import { SessionProvider } from "next-auth/react";
import { PrimeReactProvider } from "primereact/api";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* ripple: material-style click feedback on PrimeReact buttons and menus */}
      <PrimeReactProvider value={{ ripple: true }}>{children}</PrimeReactProvider>
    </SessionProvider>
  );
}
