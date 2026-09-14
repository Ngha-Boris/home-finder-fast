import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, Home, PlusCircle } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
import { ErrorState, EmptyState } from "@/components/states";
import { ListingRow } from "@/components/listing-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyHouses } from "@/lib/houses-api";

export const Route = createFileRoute("/_landlord/landlord/dashboard")({
  head: () => ({
    meta: [
      { title: "Landlord dashboard — Nyumba" },
      { name: "description", content: "Manage your rental listings, photos and availability." },
      { property: "og:title", content: "Landlord dashboard — Nyumba" },
      { property: "og:description", content: "Manage your rental listings on Nyumba." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["my-houses"],
    queryFn: fetchMyHouses,
  });

  const houses = data ?? [];
  const available = houses.filter((h) => h.availability === "available").length;

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">An overview of your properties.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/landlord/listings/new">
            <PlusCircle className="h-5 w-5" />
            Add House
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Home} label="Total listings" value={isPending ? null : houses.length} />
        <StatCard icon={CheckCircle2} label="Available" value={isPending ? null : available} />
        <StatCard
          icon={EyeOff}
          label="Unavailable"
          value={isPending ? null : houses.length - available}
        />
      </div>

      <h2 className="mt-10 font-display text-xl font-bold">Recent listings</h2>
      <div className="mt-4 space-y-3">
        {isPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : houses.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Add your first house and tenants will be able to call you right away."
            action={
              <Button asChild>
                <Link to="/landlord/listings/new">Add a house</Link>
              </Button>
            }
          />
        ) : (
          houses.slice(0, 5).map((house) => <ListingRow key={house.id} house={house} />)
        )}
      </div>
    </LandlordShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: number | null;
}) {
  return (
    <Card className="flex items-center gap-4 p-5 shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-7 w-10" />
        ) : (
          <p className="font-display text-2xl font-bold">{value}</p>
        )}
      </div>
    </Card>
  );
}
