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
import { useSession } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyHouses } from "@/lib/houses-api";
import { HOUSE_TYPES, type House, type HouseType } from "@/lib/houses-types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_landlord/landlord/listings/")({
  head: () => ({
    meta: [
      { title: "My listings — Easy Rent" },
      { name: "description", content: "View, edit and delete the rental houses you have listed." },
      { property: "og:title", content: "My listings — Easy Rent" },
      { property: "og:description", content: "View, edit and delete your rental listings." },
    ],
  }),
  component: MyListingsPage,
});

function MyListingsPage() {
  const { user } = useSession();
  const myHousesQueryKey = ["my-houses", user?.id] as const;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "available" | "unavailable">("all");
  const [type, setType] = useState<"all" | HouseType>("all");
  const { t, houseType } = useI18n();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: myHousesQueryKey,
    queryFn: fetchMyHouses,
    enabled: !!user,
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
        houseType(house.house_type),
        house.amenities.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [houseType, houses, query, status, type]);

  const hasFilters = !!query.trim() || status !== "all" || type !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setType("all");
  };

  return (
    <LandlordShell>
      <div className="stage-surface overflow-hidden rounded-2xl border border-white/15 p-4 text-primary-foreground shadow-card min-[375px]:p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              {t("landlord.myListingsTitle")}
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/78">
              {t("landlord.myListingsSubtitle")}
            </p>
          </div>
          <Button asChild variant="heroOutline" className="w-full sm:w-auto">
            <Link to="/landlord/listings/new">
              <PlusCircle className="h-4 w-4" />
              {t("common.addHouse")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 min-[420px]:grid-cols-3 sm:mt-6">
        <SummaryCard
          icon={Home}
          label={t("landlord.total")}
          value={isPending ? null : houses.length}
        />
        <SummaryCard
          icon={CheckCircle2}
          label={t("common.available")}
          value={isPending ? null : available}
        />
        <SummaryCard
          icon={EyeOff}
          label={t("common.unavailable")}
          value={isPending ? null : unavailable}
        />
      </div>

      <Card className="mt-6 space-y-4 border-white/70 p-3 shadow-card sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("landlord.searchListings")}
            aria-label={t("landlord.searchListingsAria")}
            className="h-11 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap">
          {(["all", "available", "unavailable"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={status === value ? "default" : "secondary"}
              className="justify-center"
              onClick={() => setStatus(value)}
            >
              {value === "all"
                ? t("landlord.allStatus")
                : value === "available"
                  ? t("common.available")
                  : t("common.unavailable")}
            </Button>
          ))}
          {HOUSE_TYPES.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={type === option.value ? "default" : "secondary"}
              className="justify-center"
              onClick={() => setType(type === option.value ? "all" : option.value)}
            >
              {houseType(option.value)}
            </Button>
          ))}
          {hasFilters ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-[360px]:col-span-2 justify-center sm:col-span-1"
              onClick={clearFilters}
            >
              <X className="h-4 w-4" />
              {t("landlord.clear")}
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
            title={t("landlord.emptyMine")}
            description={t("landlord.emptyMineDescription")}
            action={
              <Button asChild>
                <Link to="/landlord/listings/new">{t("landlord.addAHouse")}</Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("landlord.noFilterMatches")}
            description={t("landlord.noFilterMatchesDescription")}
            action={<Button onClick={clearFilters}>{t("houses.clearFilters")}</Button>}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span>
                {t("landlord.showingListings", {
                  shown: filtered.length,
                  total: houses.length,
                  noun:
                    houses.length === 1
                      ? t("landlord.listingSingular")
                      : t("landlord.listingPlural"),
                  plural: filtered.length === 1 ? "" : "s",
                })}
              </span>
              <Badge variant="secondary">{t("landlord.newestFirst")}</Badge>
            </div>
            {filtered.map((house) => (
              <ListingRow key={house.id} house={house} listQueryKey={myHousesQueryKey} />
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
    <Card className="flex items-center gap-3 border-white/70 p-4 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
