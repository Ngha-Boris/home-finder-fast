import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, EyeOff, RefreshCw, Users } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
import { ListingRow } from "@/components/listing-row";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAllHousesAdmin, fetchLandlordsAdmin } from "@/lib/houses-api";
import { formatPhoneDisplay } from "@/lib/phone";

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Easy Rent" },
      { name: "description", content: "Review landlords and every listing on the platform." },
      { property: "og:title", content: "Admin — Easy Rent" },
      { property: "og:description", content: "Platform administration for Easy Rent." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const houses = useQuery({ queryKey: ["admin-houses"], queryFn: fetchAllHousesAdmin });
  const landlords = useQuery({ queryKey: ["admin-landlords"], queryFn: fetchLandlordsAdmin });
  const allHouses = houses.data ?? [];
  const available = allHouses.filter((house) => house.availability === "available").length;
  const unavailable = allHouses.length - available;
  const refreshing = houses.isFetching || landlords.isFetching;

  const refresh = () => {
    void houses.refetch();
    void landlords.refetch();
  };

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor landlords and keep platform listings accurate.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          icon={Building2}
          label="Listings"
          value={houses.isPending ? null : allHouses.length}
        />
        <AdminStat
          icon={CheckCircle2}
          label="Available"
          value={houses.isPending ? null : available}
        />
        <AdminStat
          icon={EyeOff}
          label="Unavailable"
          value={houses.isPending ? null : unavailable}
        />
        <AdminStat
          icon={Users}
          label="Landlords"
          value={landlords.isPending ? null : (landlords.data?.length ?? 0)}
        />
      </div>

      <h2 className="mt-10 font-display text-xl font-bold">Landlords</h2>
      <Card className="mt-4 overflow-x-auto shadow-card">
        {landlords.isPending ? (
          <Skeleton className="m-4 h-32" />
        ) : landlords.isError ? (
          <ErrorState onRetry={() => landlords.refetch()} />
        ) : (landlords.data ?? []).length === 0 ? (
          <EmptyState
            title="No landlords yet"
            description="Registered landlord profiles will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Listings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(landlords.data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.display_name ?? "—"}</TableCell>
                  <TableCell>{l.phone_number ? formatPhoneDisplay(l.phone_number) : "—"}</TableCell>
                  <TableCell className="text-right">{l.listing_count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <h2 className="mt-10 font-display text-xl font-bold">All listings</h2>
      <div className="mt-4 space-y-3">
        {houses.isPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : houses.isError ? (
          <ErrorState onRetry={() => houses.refetch()} />
        ) : allHouses.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Every listing added to Easy Rent will appear here for review."
          />
        ) : (
          allHouses.map((house) => <ListingRow key={house.id} house={house} adminMode />)
        )}
      </div>
    </LandlordShell>
  );
}

function AdminStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
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
          <Skeleton className="mt-1 h-7 w-12" />
        ) : (
          <p className="font-display text-2xl font-bold">{value}</p>
        )}
      </div>
    </Card>
  );
}
