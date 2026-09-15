import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const { user } = useSession();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const accountPath = user ? "/landlord/dashboard" : "/landlord/login";
  const accountLabel = user ? t("common.dashboard") : t("landlord.addAHouse");
  const onLoginPage = pathname === "/landlord/login";

  if (onLoginPage) return null;

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch gap-2 p-2">
        <Button asChild variant="ghost" className="h-14 flex-1 flex-col gap-1 rounded-xl">
          <Link to="/favorites">
            <Heart className="h-5 w-5" />
            <span className="text-xs font-medium">{t("favorites.title")}</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className="h-14 flex-1 flex-col gap-1 rounded-xl">
          <Link to={accountPath}>
            <PlusCircle className="h-5 w-5" />
            <span className="text-xs font-medium">{accountLabel}</span>
          </Link>
        </Button>
      </div>
    </nav>
  );
}
