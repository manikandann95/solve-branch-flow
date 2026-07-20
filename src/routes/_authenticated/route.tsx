import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, FolderGit2, LibraryBig, Star, Trash2, LogOut, User as UserIcon,
  GitBranch, Menu, X, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trees", label: "My Trees", icon: FolderGit2 },
  { to: "/templates", label: "Templates", icon: LibraryBig },
  { to: "/favorites", label: "Favorites", icon: Star },
  { to: "/trash", label: "Trash", icon: Trash2 },
] as const;

function AuthLayout() {
  const { user } = Route.useRouteContext() as { user: User };
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const qc = useQueryClient();

  // Auto-collapse chrome for full-canvas routes
  const isCanvasRoute = /^\/tree\/[^/]+\/(build|navigate)$/.test(pathname);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  useEffect(() => setMobileOpen(false), [pathname]);

  if (isCanvasRoute) {
    return <div className="min-h-screen"><Outlet /></div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 md:flex",
          open ? "w-64" : "w-[68px]",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/20 text-primary">
            <GitBranch className="h-4 w-4" />
          </div>
          {open && <span className="truncate text-sm font-bold tracking-tight">TroubleshootFlow</span>}
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {open && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {(user.email ?? "?")[0].toUpperCase()}
            </div>
            {open && <span className="truncate text-xs">{user.email}</span>}
          </Link>
          <button
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {open && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur" onClick={() => setMobileOpen(false)} />
          <aside className="animate-in slide-in-from-left absolute left-0 top-0 h-full w-64 border-r border-sidebar-border bg-sidebar p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold">TroubleshootFlow</span>
              <button onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
          <button onClick={() => setMobileOpen(true)} className="md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trees, nodes, commands…  (Ctrl+K)"
              className="h-9 pl-9"
              onFocus={() => toast.info("Global search — filter by title on the Trees page")}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/profile">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary ring-1 ring-primary/40">
                <UserIcon className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
