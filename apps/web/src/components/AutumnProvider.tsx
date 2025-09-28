"use client";
import { api } from "@jym/backend/convex/_generated/api";
import { AutumnProvider } from "autumn-js/react";
import { useConvex } from "convex/react";

export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  const convex = useConvex();

  return (
    <AutumnProvider convex={convex} convexApi={(api as any).autumn}>
      {children}
    </AutumnProvider>
  );
}
