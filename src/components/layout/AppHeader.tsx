"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const TOP_LEVEL_PATHS = ["/", "/insights", "/accounts", "/upload"];

const PAGE_TITLES: Record<string, string> = {
  "/insights": "Patterns",
  "/accounts": "Accounts",
  "/upload": "Upload",
  "/review": "Review",
  "/review/business": "Business Review",
  "/review/personal": "Personal Review",
  "/buckets/new": "New Bucket",
  "/accounts/new": "New Account",
  "/accounts/link": "Link Account",
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isTopLevel = TOP_LEVEL_PATHS.includes(pathname);

  // Dashboard has its own header
  if (pathname === "/") return null;

  const title = PAGE_TITLES[pathname] ?? "";

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center gap-3 bg-bg-primary/80 backdrop-blur-xl px-4 pt-[env(safe-area-inset-top)] h-[60px]">
          {!isTopLevel && (
            <button
              onClick={() => router.back()}
              className="flex size-8 items-center justify-center rounded-lg bg-bg-secondary transition-colors hover:bg-bg-secondary-hover"
            >
              <ChevronLeft className="size-4 text-text-primary" />
            </button>
          )}
          {title && (
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              {title}
            </h1>
          )}
          {isTopLevel && (
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Sailor
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
