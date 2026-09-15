import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
import { ListingRow } from "@/components/listing-row";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllHousesAdmin } from "@/lib/houses-api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin/admin/listings")({
  head: () => ({
    meta: [
      { title: "Admin listings - Easy Rent" },
      { name: "description", content: "Review and moderate every listing on Easy Rent." },
      { property: "og:title", content: "Admin listings - Easy Rent" },
      { property: "og:description", content: "Review and moderate rental listings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminListingsPage,
});

function AdminListingsPage() {
  const houses = useQuery({ queryKey: ["admin-houses"], queryFn: fetchAllHousesAdmin });
  const { t } = useI18n();

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.listingsTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.listingsSubtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => houses.refetch()} disabled={houses.isFetching}>
          <RefreshCw className={`h-4 w-4 ${houses.isFetching ? "animate-spin" : ""}`} />
          {t("admin.refresh")}
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
            title={t("admin.noListings")}
            description={t("admin.noListingsDescription")}
          />
        ) : (
          houses.data!.map((house) => <ListingRow key={house.id} house={house} adminMode />)
        )}
      </div>
    </LandlordShell>
  );
}
