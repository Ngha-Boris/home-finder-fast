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
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto flex w-full max-w-md items-stretch gap-1 p-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const label = t(item.label);
            return (
              <Button
                key={item.to}
                asChild
                variant={active ? "default" : "ghost"}
                className="h-14 flex-1 flex-col gap-1 rounded-xl px-1"
              >
                <Link to={item.to}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="w-full truncate text-center text-[11px] font-medium">
                    {label}
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
