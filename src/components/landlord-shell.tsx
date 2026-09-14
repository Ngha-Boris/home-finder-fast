import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Home,
  LayoutDashboard,
  List,
  LogOut,
  PlusCircle,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { fetchIsAdmin, useSession, useSignOut } from "@/hooks/use-auth";
import { ensureLandlordAccount } from "@/lib/houses-api";
import { useOnline } from "@/hooks/use-online";

const NAV = [
  { to: "/landlord/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/landlord/listings", label: "My Listings", icon: List },
  { to: "/landlord/listings/new", label: "Add House", icon: PlusCircle },
  { to: "/landlord/profile", label: "Profile", icon: User },
] as const;

export function LandlordShell({ children }: { children: ReactNode }) {
  const signOut = useSignOut();
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const online = useOnline();
  const admin = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => fetchIsAdmin(user),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    ensureLandlordAccount(user).catch((error) => {
      console.warn("[auth] Landlord account preparation failed", error);
    });
  }, [user]);

  const nav = admin.data
    ? [
        ...NAV,
        { to: "/admin", label: "Admin", icon: ShieldCheck },
        { to: "/admin/listings", label: "Listings", icon: Building2 },
        { to: "/admin/landlords", label: "Landlords", icon: Users },
      ]
    : NAV;

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 shadow-sm backdrop-blur-xl">
        <div className="container-page flex h-14 items-center justify-between gap-3 sm:h-16">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="gradient-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-card">
              <Home className="h-5 w-5" />
            </span>
            <span className="truncate font-display text-lg font-extrabold">Easy Rent</span>
          </Link>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
        <nav className="container-page flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Button
                key={item.to}
                asChild
                size="sm"
                variant={active ? "default" : "ghost"}
                className="h-9 shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm"
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

      <main className="container-page flex-1 py-5 sm:py-8">{children}</main>
    </div>
  );
}
