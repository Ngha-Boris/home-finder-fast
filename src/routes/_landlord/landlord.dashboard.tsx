import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, Home, PlusCircle } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
import { ErrorState, EmptyState } from "@/components/states";
import { ListingRow } from "@/components/listing-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyHouses } from "@/lib/houses-api";

export const Route = createFileRoute("/_landlord/landlord/dashboard")({
  head: () => ({
    meta: [
      { title: "Landlord dashboard — Easy Rent" },
      { name: "description", content: "Manage your rental listings, photos and availability." },
      { property: "og:title", content: "Landlord dashboard — Easy Rent" },
      { property: "og:description", content: "Manage your rental listings on Easy Rent." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useSession();
  const myHousesQueryKey = ["my-houses", user?.id] as const;
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: myHousesQueryKey,
    queryFn: fetchMyHouses,
    enabled: !!user,
  });

  const houses = data ?? [];
  const available = houses.filter((h) => h.availability === "available").length;

  return (
    <LandlordShell>
      <div className="stage-surface overflow-hidden rounded-2xl border border-white/15 p-4 text-primary-foreground shadow-card min-[375px]:p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-primary-foreground/78">
              An overview of your properties.
            </p>
          </div>
          <Button asChild size="lg" variant="heroOutline" className="w-full sm:w-auto">
            <Link to="/landlord/listings/new">
              <PlusCircle className="h-5 w-5" />
              Add House
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 min-[420px]:grid-cols-3 sm:mt-6 sm:gap-4">
        <StatCard icon={Home} label="Total listings" value={isPending ? null : houses.length} />
        <StatCard icon={CheckCircle2} label="Available" value={isPending ? null : available} />
        <StatCard
          icon={EyeOff}
          label="Unavailable"
          value={isPending ? null : houses.length - available}
        />
      </div>

      <h2 className="mt-8 font-display text-xl font-bold sm:mt-10">Recent listings</h2>
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
          houses
            .slice(0, 5)
            .map((house) => (
              <ListingRow key={house.id} house={house} listQueryKey={myHousesQueryKey} />
            ))
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
    <Card className="flex min-w-0 items-center gap-3 border-white/70 p-4 shadow-card sm:gap-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <div className="min-w-0">
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
