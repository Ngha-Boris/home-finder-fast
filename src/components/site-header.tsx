import { Link } from "@tanstack/react-router";
import { Heart, Home, PlusCircle } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const { user } = useSession();
  const { t } = useI18n();
  const accountPath = user ? "/landlord/dashboard" : "/landlord/login";
  const accountLabel = user ? t("common.dashboard") : t("landlord.addAHouse");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/82 shadow-sm backdrop-blur-xl">
      <div className="container-page flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-card min-[375px]:h-9 min-[375px]:w-9">
            <Home className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5" />
          </span>
          <span className="truncate font-display text-base font-extrabold tracking-normal min-[375px]:text-lg">
            {t("common.brand")}
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <LanguageToggle compact />
          <Button asChild className="hidden sm:inline-flex">
            <Link to={accountPath}>
              <PlusCircle className="h-4 w-4" />
              {accountLabel}
            </Link>
          </Button>
        </nav>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-8px_24px_rgba(16,19,28,0.08)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Button asChild className="h-11 min-w-0 flex-1 justify-center gap-1 px-2">
            <Link to="/favorites">
              <Heart className="h-4 w-4" />
              <span className="hidden truncate min-[360px]:inline">{t("favorites.title")}</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 min-w-0 flex-1 justify-center gap-1 px-2"
          >
            <Link to={accountPath}>
              <PlusCircle className="h-4 w-4" />
              <span className="hidden truncate min-[360px]:inline">{accountLabel}</span>
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
