import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
import { ListingRow } from "@/components/listing-row";
import { ErrorState } from "@/components/states";
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
      { title: "Admin — Nyumba" },
      { name: "description", content: "Review landlords and every listing on the platform." },
      { property: "og:title", content: "Admin — Nyumba" },
      { property: "og:description", content: "Platform administration for Nyumba." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const houses = useQuery({ queryKey: ["admin-houses"], queryFn: fetchAllHousesAdmin });
  const landlords = useQuery({ queryKey: ["admin-landlords"], queryFn: fetchLandlordsAdmin });

  return (
    <LandlordShell>
      <h1 className="font-display text-3xl font-bold">Admin</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Listings</p>
            <p className="font-display text-2xl font-bold">{houses.data?.length ?? "—"}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Landlords</p>
            <p className="font-display text-2xl font-bold">{landlords.data?.length ?? "—"}</p>
          </div>
        </Card>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold">Landlords</h2>
      <Card className="mt-4 overflow-x-auto shadow-card">
        {landlords.isPending ? (
          <Skeleton className="m-4 h-32" />
        ) : landlords.isError ? (
          <ErrorState onRetry={() => landlords.refetch()} />
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
                  <TableCell className="font-medium">{l.full_name ?? "—"}</TableCell>
                  <TableCell>{l.phone ? formatPhoneDisplay(l.phone) : "—"}</TableCell>
                  <TableCell className="text-right">{l.house_count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <h2 className="mt-10 font-display text-xl font-bold">All listings</h2>
      <div className="mt-4 space-y-3">
        {houses.isPending ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : houses.isError ? (
          <ErrorState onRetry={() => houses.refetch()} />
        ) : (
          (houses.data ?? []).map((house) => (
            <ListingRow key={house.id} house={house} adminMode />
          ))
        )}
      </div>
    </LandlordShell>
  );
}
