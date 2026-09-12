import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, Home, PlusCircle, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { LandlordShell } from "@/components/landlord-shell";
import { ListingRow } from "@/components/listing-row";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyHouses } from "@/lib/houses-api";
import { HOUSE_TYPES, houseTypeLabel, type House, type HouseType } from "@/lib/houses-types";

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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "available" | "unavailable">("all");
  const [type, setType] = useState<"all" | HouseType>("all");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["my-houses"],
    queryFn: fetchMyHouses,
  });

  const houses = useMemo(() => data ?? [], [data]);
  const available = houses.filter((house) => house.availability === "available").length;
  const unavailable = houses.length - available;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return houses.filter((house: House) => {
      if (status !== "all" && house.availability !== status) return false;
      if (type !== "all" && house.house_type !== type) return false;
      if (!q) return true;
      return [
        house.location,
        house.region,
        house.description,
        house.location_details ?? "",
        houseTypeLabel(house.house_type),
        house.amenities.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [houses, query, status, type]);

  const hasFilters = !!query.trim() || status !== "all" || type !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setType("all");
  };

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">My listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, update, and publish the properties tenants can contact you about.
          </p>
        </div>
        <Button asChild>
          <Link to="/landlord/listings/new">
            <PlusCircle className="h-4 w-4" />
            Add House
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={Home} label="Total" value={isPending ? null : houses.length} />
        <SummaryCard icon={CheckCircle2} label="Available" value={isPending ? null : available} />
        <SummaryCard icon={EyeOff} label="Unavailable" value={isPending ? null : unavailable} />
      </div>

      <Card className="mt-6 space-y-4 p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your listings..."
            aria-label="Search your listings"
            className="h-11 pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "available", "unavailable"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={status === value ? "default" : "secondary"}
              onClick={() => setStatus(value)}
            >
              {value === "all" ? "All status" : value === "available" ? "Available" : "Unavailable"}
            </Button>
          ))}
          {HOUSE_TYPES.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={type === option.value ? "default" : "secondary"}
              onClick={() => setType(type === option.value ? "all" : option.value)}
            >
              {option.label}
            </Button>
          ))}
          {hasFilters ? (
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="mt-6 space-y-3">
        {isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : houses.length === 0 ? (
          <EmptyState
            title="You have no listings"
            description="Add a house to start receiving calls from tenants."
            action={
              <Button asChild>
                <Link to="/landlord/listings/new">Add a house</Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No listings match your filters"
            description="Try another search term, status, or house type."
            action={<Button onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {filtered.length} of {houses.length} listing{houses.length === 1 ? "" : "s"}
              </span>
              <Badge variant="secondary">Newest first</Badge>
            </div>
            {filtered.map((house) => (
              <ListingRow key={house.id} house={house} />
            ))}
          </>
        )}
      </div>
    </LandlordShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: number | null;
}) {
  return (
    <Card className="flex items-center gap-3 p-4 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-10" />
        ) : (
          <p className="font-display text-xl font-bold">{value}</p>
        )}
      </div>
    </Card>
  );
}
