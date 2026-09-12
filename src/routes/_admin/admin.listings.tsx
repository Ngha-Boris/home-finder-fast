import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
import { ListingRow } from "@/components/listing-row";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllHousesAdmin } from "@/lib/houses-api";

export const Route = createFileRoute("/_admin/admin/listings")({
  head: () => ({
    meta: [
      { title: "Admin listings - Nyumba" },
      { name: "description", content: "Review and moderate every listing on Nyumba." },
      { property: "og:title", content: "Admin listings - Nyumba" },
      { property: "og:description", content: "Review and moderate rental listings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminListingsPage,
});

function AdminListingsPage() {
  const houses = useQuery({ queryKey: ["admin-houses"], queryFn: fetchAllHousesAdmin });

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View, disable, or remove listings across the platform.
          </p>
        </div>
        <Button variant="outline" onClick={() => houses.refetch()} disabled={houses.isFetching}>
          <RefreshCw className={`h-4 w-4 ${houses.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {houses.isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : houses.isError ? (
          <ErrorState onRetry={() => houses.refetch()} />
        ) : (houses.data ?? []).length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Every listing added to Nyumba will appear here."
          />
        ) : (
          houses.data!.map((house) => <ListingRow key={house.id} house={house} adminMode />)
        )}
      </div>
    </LandlordShell>
  );
}
