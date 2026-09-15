import { Link } from "@tanstack/react-router";
import { Home, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user } = useSession();
  const accountPath = user ? "/landlord/dashboard" : "/landlord/login";
  const accountLabel = user ? "Dashboard" : "Add a house";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/82 shadow-sm backdrop-blur-xl">
      <div className="container-page flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="gradient-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-card">
            <Home className="h-5 w-5" />
          </span>
          <span className="truncate font-display text-lg font-extrabold tracking-normal">
            Easy Rent
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Button asChild>
            <Link to={user ? "/landlord/dashboard" : "/landlord/login"}>
              <PlusCircle className="h-4 w-4" />
              {user ? "Dashboard" : "Add House"}
            </Link>
          </Button>
        </nav>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_24px_rgba(16,19,28,0.08)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Button asChild className="h-11 min-w-0 flex-1 justify-center">
            <Link to="/houses">
              <Search className="h-4 w-4" />
              Browse houses
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 min-w-0 flex-1 justify-center">
            <Link to={accountPath}>
              <PlusCircle className="h-4 w-4" />
              {accountLabel}
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
