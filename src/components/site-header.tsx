import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, PlusCircle } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function SiteHeader({ showMobileDock = true }: { showMobileDock?: boolean }) {
  const { user } = useSession();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const accountPath = user ? "/landlord/dashboard" : "/landlord/login";
  const accountLabel = user ? t("common.dashboard") : t("landlord.addAHouse");
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
      <div className="mx-auto flex w-full max-w-sm items-center justify-center gap-3 p-2">
        <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-full">
          <Link to="/favorites" aria-label={t("favorites.title")}>
            <Heart className="h-5 w-5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-full">
          <Link to={accountPath} aria-label={accountLabel}>
            <PlusCircle className="h-5 w-5" />
          </Link>
        </Button>
        <LanguageToggle compact iconOnly className="h-12 w-12 rounded-full p-0" />
      </div>
    </nav>
  );
}
