import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Languages, PlusCircle } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function SiteHeader({ showMobileDock = true }: { showMobileDock?: boolean }) {
  const { user } = useSession();
  const { language, setLanguage, t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const accountPath = user ? "/landlord/dashboard" : "/landlord/login";
  const accountLabel = user ? t("common.dashboard") : t("common.addHouse");
  const nextLanguage = language === "en" ? "fr" : "en";
  const onAuthPage =
    pathname === "/landlord/login" ||
    pathname === "/landlord/register" ||
    pathname === "/landlord/reset-password";

  if (onAuthPage || !showMobileDock) {
    return (
      <div className="fixed right-3 top-3 z-50">
        <LanguageToggle compact />
      </div>
    );
  }

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto grid w-full max-w-sm grid-cols-3 items-center gap-1 px-3 py-1.5">
        <Button asChild variant="ghost" className="h-14 min-w-0 rounded-xl px-1">
          <Link to="/favorites" aria-label={t("common.saved")} className="flex-col gap-1">
            <Heart className="h-5 w-5" />
            <span className="w-full truncate text-center text-[11px] leading-none">
              {t("common.saved")}
            </span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className="h-14 min-w-0 rounded-xl px-1">
          <Link to={accountPath} aria-label={accountLabel} className="flex-col gap-1">
            <PlusCircle className="h-5 w-5" />
            <span className="w-full truncate text-center text-[11px] leading-none">
              {accountLabel}
            </span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-14 min-w-0 flex-col gap-1 rounded-xl px-1"
          onClick={() => setLanguage(nextLanguage)}
          aria-label={language === "en" ? "Passer en français" : "Switch to English"}
          title={language === "en" ? "Passer en français" : "Switch to English"}
        >
          <Languages className="h-5 w-5" />
          <span className="w-full truncate text-center text-[11px] uppercase leading-none">
            {nextLanguage}
          </span>
        </Button>
      </div>
    </nav>
  );
}
