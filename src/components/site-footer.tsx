import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/40">
      <div className="container-page flex flex-col gap-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Nyumba — rental houses across Cameroon.</p>
        <nav className="flex flex-wrap gap-4">
          <Link to="/houses" className="hover:text-foreground">
            Browse houses
          </Link>
          <Link to="/landlord/register" className="hover:text-foreground">
            List your house
          </Link>
          <Link to="/landlord/login" className="hover:text-foreground">
            Landlord login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
