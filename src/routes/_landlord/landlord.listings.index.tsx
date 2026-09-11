import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
import { ListingRow } from "@/components/listing-row";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyHouses } from "@/lib/houses-api";

export const Route = createFileRoute("/_landlord/landlord/listings/")({
  head: () => ({
    meta: [
      { title: "My listings — Nyumba" },
      { name: "description", content: "View, edit and delete the rental houses you have listed." },
      { property: "og:title", content: "My listings — Nyumba" },
      { property: "og:description", content: "View, edit and delete your rental listings." },
    ],
  }),
  component: MyListingsPage,
});

function MyListingsPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["my-houses"],
    queryFn: fetchMyHouses,
  });

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">My listings</h1>
        <Button asChild>
          <Link to="/landlord/listings/new">
            <PlusCircle className="h-4 w-4" />
            Add House
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {isPending ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            title="You have no listings"
            description="Add a house to start receiving calls from tenants."
            action={
              <Button asChild>
                <Link to="/landlord/listings/new">Add a house</Link>
              </Button>
            }
          />
        ) : (
          data!.map((house) => <ListingRow key={house.id} house={house} />)
        )}
      </div>
    </LandlordShell>
  );
}
