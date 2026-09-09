import { Link } from "@tanstack/react-router";
import { Home, Menu, PlusCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-auth";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();

  const links = [
    { to: "/houses", label: "Houses" },
    { to: user ? "/landlord/dashboard" : "/landlord/login", label: user ? "Dashboard" : "Add House" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="gradient-brand flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground">
            <Home className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Nyumba</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Button asChild variant="ghost">
            <Link to="/houses">Houses</Link>
          </Button>
          <Button asChild>
            <Link to={user ? "/landlord/dashboard" : "/landlord/login"}>
              <PlusCircle className="h-4 w-4" />
              {user ? "Dashboard" : "Add House"}
            </Link>
          </Button>
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="sm:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="mb-6 font-display text-lg">Nyumba</SheetTitle>
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
    </header>
  );
}
