import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { LandlordShell } from "@/components/landlord-shell";
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
import { fetchLandlordsAdmin } from "@/lib/houses-api";
import { formatPhoneDisplay } from "@/lib/phone";

export const Route = createFileRoute("/_admin/admin/landlords")({
  head: () => ({
    meta: [
      { title: "Admin landlords - Easy Rent" },
      { name: "description", content: "Review landlord profiles on Easy Rent." },
      { property: "og:title", content: "Admin landlords - Easy Rent" },
      { property: "og:description", content: "Review landlord profiles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLandlordsPage,
});

function AdminLandlordsPage() {
  const landlords = useQuery({ queryKey: ["admin-landlords"], queryFn: fetchLandlordsAdmin });

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin landlords</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review registered landlords and listing counts.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => landlords.refetch()}
          disabled={landlords.isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${landlords.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="mt-6 overflow-x-auto shadow-card">
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
              {(landlords.data ?? []).map((landlord) => (
                <TableRow key={landlord.id}>
                  <TableCell className="font-medium">
                    {landlord.display_name ?? "No name yet"}
                  </TableCell>
                  <TableCell>
                    {landlord.phone_number ? formatPhoneDisplay(landlord.phone_number) : "-"}
                  </TableCell>
                  <TableCell className="text-right">{landlord.listing_count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </LandlordShell>
  );
}
