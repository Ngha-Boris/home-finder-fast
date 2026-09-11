import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutDashboard, List, LogOut, PlusCircle, User } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-auth";
import { useOnline } from "@/hooks/use-online";

const NAV = [
  { to: "/landlord/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/landlord/listings", label: "My Listings", icon: List },
  { to: "/landlord/listings/new", label: "Add House", icon: PlusCircle },
  { to: "/landlord/profile", label: "Profile", icon: User },
] as const;

export function LandlordShell({ children }: { children: ReactNode }) {
  const signOut = useSignOut();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const online = useOnline();

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="gradient-brand flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground">
              <Home className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold">Nyumba</span>
          </Link>
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
        <nav className="container-page flex gap-1 overflow-x-auto pb-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Button
                key={item.to}
                asChild
                size="sm"
                variant={active ? "default" : "ghost"}
                className="shrink-0"
              >
                <Link to={item.to}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </header>

      {!online ? (
        <div className="bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
          You're offline — changes to your listings need an internet connection.
        </div>
      ) : null}

      <main className="container-page flex-1 py-8">{children}</main>
    </div>
  );
}
