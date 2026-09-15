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
        <div className="container-page flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-card min-[375px]:h-9 min-[375px]:w-9">
              <Home className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5" />
            </span>
            <span className="truncate font-display text-base font-extrabold min-[375px]:text-lg">
              {t("common.brand")}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageToggle compact />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2 min-[375px]:h-9 sm:h-9"
              onClick={() => void signOut()}
              aria-label={t("common.logout")}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.logout")}</span>
            </Button>
          </div>
        </div>
        <nav className="mobile-scroll container-page hidden gap-1 overflow-x-auto pb-2 sm:flex">
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

      <main className="container-page flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:py-8">
        {children}
      </main>

      <nav
        aria-label="Landlord navigation"
        className="fixed inset-x-0 bottom-3 z-50 px-3 pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center justify-center gap-1.5 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-[0_12px_36px_rgba(16,19,28,0.22)] backdrop-blur-xl">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const label = t(item.label);
            return (
              <Button
                key={item.to}
                asChild
                size="icon"
                variant={active ? "default" : "ghost"}
                className="h-11 w-11 shrink-0 rounded-full min-[375px]:h-12 min-[375px]:w-12"
              >
                <Link to={item.to}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="sr-only">{label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
