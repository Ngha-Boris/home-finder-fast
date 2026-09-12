import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HouseCard, HouseCardSkeleton } from "@/components/house-card";
import { CachedNotice, OfflineBanner } from "@/components/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { fetchAvailableHouses } from "@/lib/houses-api";
import {
  HOUSE_TYPES,
  PRICE_PRESETS,
  houseTypeLabel,
  type House,
  type HouseType,
} from "@/lib/houses-types";
import { CACHE_KEYS } from "@/lib/idb-cache";

type Search = {
  q: string | undefined;
  type: string | undefined;
  region: string | undefined;
  min: number | undefined;
  max: number | undefined;
};

const PAGE_SIZE = 9;

export const Route = createFileRoute("/houses/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    type: typeof search["type"] === "string" ? search["type"] : undefined,
    region: typeof search["region"] === "string" ? search["region"] : undefined,
    min: Number.isFinite(Number(search["min"])) && search["min"] !== undefined && search["min"] !== "" ? Number(search["min"]) : undefined,
    max: Number.isFinite(Number(search["max"])) && search["max"] !== undefined && search["max"] !== "" ? Number(search["max"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse rental houses — Nyumba" },
      {
        name: "description",
        content:
          "Search available studio apartments and single rooms across Cameroon. Filter by region, house type and monthly rent.",
      },
      { property: "og:title", content: "Browse rental houses — Nyumba" },
      {
        property: "og:description",
        content: "Search available rental houses and filter by region, type and monthly rent.",
      },
    ],
  }),
  component: HousesPage,
});

function HousesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/houses/" });

  const [queryInput, setQueryInput] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Debounced text search -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      const value = queryInput.trim();
      if ((search.q ?? "") !== value) {
        navigate({ search: (prev: Search) => ({ ...prev, q: value || undefined }), replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const { data, isLoading, isError, isFromCache, refetch } = useCachedQuery({
    queryKey: ["houses", "feed"],
    cacheKey: CACHE_KEYS.feed,
    queryFn: fetchAvailableHouses,
  });

  const regions = useMemo(
    () => Array.from(new Set((data ?? []).map((h) => h.region))).sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const q = (search.q ?? "").toLowerCase();
    return (data ?? []).filter((h: House) => {
      if (search.type && h.house_type !== search.type) return false;
      if (search.region && h.region !== search.region) return false;
      if (search.min !== undefined && h.rent_price < search.min) return false;
      if (search.max !== undefined && h.rent_price > search.max) return false;
      if (!q) return true;
      const haystack = [h.location, h.region, h.description, h.location_details ?? "", houseTypeLabel(h.house_type)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  useEffect(() => setVisible(PAGE_SIZE), [search.q, search.type, search.region, search.min, search.max]);

  const hasFilters = !!(search.q || search.type || search.region || search.min || search.max);
  const clearFilters = () => {
    setQueryInput("");
    navigate({ search: {}, replace: true });
  };

  const setPreset = (min?: number, max?: number) =>
    navigate({ search: (prev: Search) => ({ ...prev, min, max }), replace: true });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <OfflineBanner />

      <main className="container-page flex-1 py-8">
        <h1 className="font-display text-3xl font-bold">Available houses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Loading listings…" : `${filtered.length} house${filtered.length === 1 ? "" : "s"} match your search`}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search location, region or description…"
              aria-label="Search houses"
              className="h-12 pl-10"
            />
          </div>
          <Button
            variant="outline"
            className="h-12 sm:w-auto"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} mt-4 gap-4 rounded-xl border border-border bg-card p-4 sm:grid sm:grid-cols-2 lg:grid-cols-4`}>
          <div className="space-y-1.5">
            <Label>House type</Label>
            <Select
              value={search.type ?? "all"}
              onValueChange={(v) =>
                navigate({
                  search: (prev: Search) => ({ ...prev, type: v === "all" ? undefined : (v as HouseType) }),
                  replace: true,
                })
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {HOUSE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Region</Label>
            <Select
              value={search.region ?? "all"}
              onValueChange={(v) =>
                navigate({
                  search: (prev: Search) => ({ ...prev, region: v === "all" ? undefined : v }),
                  replace: true,
                })
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min-rent">Min rent (FCFA)</Label>
            <Input
              id="min-rent"
              type="number"
              min={0}
              inputMode="numeric"
              className="h-11"
              value={search.min ?? ""}
              onChange={(e) =>
                navigate({
                  search: (prev: Search) => ({ ...prev, min: e.target.value ? Number(e.target.value) : undefined }),
                  replace: true,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-rent">Max rent (FCFA)</Label>
            <Input
              id="max-rent"
              type="number"
              min={0}
              inputMode="numeric"
              className="h-11"
              value={search.max ?? ""}
              onChange={(e) =>
                navigate({
                  search: (prev: Search) => ({ ...prev, max: e.target.value ? Number(e.target.value) : undefined }),
                  replace: true,
                })
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:col-span-4">
            {PRICE_PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                size="sm"
                variant={search.min === p.min && search.max === p.max ? "default" : "secondary"}
                onClick={() => setPreset(p.min, p.max)}
              >
                {p.label}
              </Button>
            ))}
            {hasFilters ? (
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Clear all
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <CachedNotice show={isFromCache} />

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <HouseCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No houses match your search."
              description="Try a different region, house type or rent range."
              action={
                hasFilters ? (
                  <Button onClick={clearFilters}>Clear filters</Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, visible).map((house) => (
                  <HouseCard key={house.id} house={house} />
                ))}
              </div>
              {visible < filtered.length ? (
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" size="lg" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Load more houses
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
