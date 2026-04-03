"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, CreditCard, Upload, CheckSquare } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/insights", label: "Patterns", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/upload", label: "Upload", icon: Upload },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // Only show on top-level screens
  const topLevelPaths = ["/", "/tasks", "/insights", "/accounts", "/upload"];
  const isTopLevel = topLevelPaths.includes(pathname);
  if (!isTopLevel) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center justify-around border-t border-white/10 bg-bg-primary/80 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)] pt-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[64px] ${
                  isActive
                    ? "text-text-primary"
                    : "text-text-quaternary hover:text-text-secondary"
                }`}
              >
                <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[9px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
