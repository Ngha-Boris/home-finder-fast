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
        className="fixed inset-x-0 bottom-3 z-50 px-4 pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-[0_12px_36px_rgba(16,19,28,0.22)] backdrop-blur-xl">
          <Button asChild size="icon" className="h-12 w-12 shrink-0 rounded-full">
            <Link to="/favorites">
              <Heart className="h-5 w-5" />
              <span className="sr-only">{t("favorites.title")}</span>
            </Link>
          </Button>
          <Button asChild size="icon" variant="outline" className="h-12 w-12 shrink-0 rounded-full">
            <Link to={accountPath}>
              <PlusCircle className="h-5 w-5" />
              <span className="sr-only">{accountLabel}</span>
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
