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
import { LanguageToggle } from "@/components/language-toggle";
import { fetchIsAdmin, useSession, useSignOut } from "@/hooks/use-auth";
import { ensureLandlordAccount } from "@/lib/houses-api";
import { useOnline } from "@/hooks/use-online";
import { useI18n } from "@/lib/i18n";

const NAV = [
  { to: "/landlord/dashboard", label: "common.dashboard", icon: LayoutDashboard },
  { to: "/landlord/listings", label: "nav.myListings", icon: List },
  { to: "/landlord/listings/new", label: "common.addHouse", icon: PlusCircle },
  { to: "/landlord/profile", label: "nav.profile", icon: User },
] as const;

export function LandlordShell({ children }: { children: ReactNode }) {
  const signOut = useSignOut();
  const { user } = useSession();
  const { t } = useI18n();
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
        ...NAV.map((item) => ({ ...item, label: t(item.label) })),
        { to: "/admin", label: t("nav.admin"), icon: ShieldCheck },
        { to: "/admin/listings", label: t("nav.listings"), icon: Building2 },
        { to: "/admin/landlords", label: t("nav.landlords"), icon: Users },
      ]
    : NAV.map((item) => ({ ...item, label: t(item.label) }));

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 shadow-sm backdrop-blur-xl">
        <div className="container-page flex h-14 items-center justify-between gap-3 sm:h-16">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="gradient-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-card">
              <Home className="h-5 w-5" />
            </span>
            <span className="truncate font-display text-lg font-extrabold">
              {t("common.brand")}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.logout")}</span>
            </Button>
          </div>
        </div>
        <nav className="mobile-scroll container-page flex gap-1 overflow-x-auto pb-2">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Button
                key={item.to}
                asChild
                size="sm"
                variant={active ? "default" : "ghost"}
                className="h-9 shrink-0 px-2 text-xs min-[375px]:px-2.5 sm:px-3 sm:text-sm"
              >
                <Link to={item.to}>
                  <item.icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </header>

      {!online ? (
        <div className="bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
          {t("nav.offlineLandlord")}
        </div>
      ) : null}

      <main className="container-page flex-1 py-5 sm:py-8">{children}</main>
    </div>
  );
}
