import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  label: string;
  icon: LucideIcon;
  badge?: number;
  active: boolean;
};

export function AppShell({
  nav,
  title,
  footer,
  children,
}: {
  nav: NavItem[];
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar: md and up only */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun text-sun-foreground">
            <Star className="h-5 w-5 fill-current" />
          </span>
          <span className="truncate font-display text-lg font-semibold">{title}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.label}
              to={n.to as never}
              params={n.params as never}
              search={n.search as never}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 font-bold transition",
                n.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-muted",
              )}
            >
              <n.icon className="h-5 w-5" />
              <span className="flex-1">{n.label}</span>
              {!!n.badge && (
                <span className="rounded-full bg-status-pending-bg px-2 text-xs text-status-pending">
                  {n.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        {footer}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-2 border-b bg-sidebar px-3 py-2 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sun text-sun-foreground">
              <Star className="h-4 w-4 fill-current" />
            </span>
            <span className="truncate font-display font-semibold">{title}</span>
          </div>
          {footer}
        </header>
        <main className="mx-auto w-full max-w-5xl px-3 pb-28 pt-4 xs:px-4 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>

      {/* Bottom bar: below md */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {nav.map((n) => (
          <Link
            key={n.label}
            to={n.to as never}
            params={n.params as never}
            search={n.search as never}
            className={cn(
              "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.68rem] font-bold",
              n.active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <n.icon className="h-5 w-5" />
            <span className="w-full truncate text-center">{n.label}</span>
            {!!n.badge && (
              <span className="absolute right-[18%] top-1.5 rounded-full bg-accent px-1.5 text-[0.6rem] text-accent-foreground">
                {n.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
