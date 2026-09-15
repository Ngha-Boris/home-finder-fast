import { Link } from "@tanstack/react-router";
import { Home, Menu, PlusCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const { t } = useI18n();

  const links = [
    {
      to: user ? "/landlord/dashboard" : "/landlord/login",
      label: user ? t("common.dashboard") : t("common.addHouse"),
    },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/82 shadow-sm backdrop-blur-xl">
      <div className="container-page flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="gradient-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-card">
            <Home className="h-5 w-5" />
          </span>
          <span className="truncate font-display text-lg font-extrabold tracking-normal">
            {t("common.brand")}
          </span>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <LanguageToggle compact />
          <Button asChild>
            <Link to={user ? "/landlord/dashboard" : "/landlord/login"}>
              <PlusCircle className="h-4 w-4" />
              {user ? t("common.dashboard") : t("common.addHouse")}
            </Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2 sm:hidden">
          <LanguageToggle compact />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon" aria-label={t("nav.openMenu")}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="mb-6 font-display text-lg">{t("common.brand")}</SheetTitle>
              <div className="flex flex-col gap-2">
                {links.map((l) => (
                  <Button
                    key={l.to}
                    asChild
                    variant="ghost"
                    className="h-12 justify-start text-base"
                    onClick={() => setOpen(false)}
                  >
                    <Link to={l.to}>{l.label}</Link>
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
