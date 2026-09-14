import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Home, Phone, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { HouseCard, HouseCardSkeleton } from "@/components/house-card";
import { CachedNotice } from "@/components/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { fetchAvailableHouses } from "@/lib/houses-api";
import { CACHE_KEYS } from "@/lib/idb-cache";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Easy Rent — Find your next home, faster" },
      {
        name: "description",
        content:
          "Browse verified studio apartments and single rooms for rent across Cameroon. Call or WhatsApp the landlord directly — no account needed.",
      },
      { property: "og:title", content: "Easy Rent — Find your next home, faster" },
      {
        property: "og:description",
        content:
          "Browse rental houses across Cameroon and contact landlords directly by phone or WhatsApp.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { data, isLoading, isError, isFromCache, refetch } = useCachedQuery({
    queryKey: ["houses", "feed"],
    cacheKey: CACHE_KEYS.feed,
    queryFn: fetchAvailableHouses,
  });

  const recent = (data ?? []).slice(0, 8);

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="stage-surface relative isolate overflow-hidden">
          <img
            src={heroImage}
            alt="Residential street with apartment buildings in Douala, Cameroon"
            width={1600}
            height={1008}
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="gradient-hero absolute inset-0 -z-10" />
          <div className="container-page py-10 text-primary-foreground sm:py-20">
            <div className="max-w-2xl">
              <div className="max-w-2xl animate-fade-up">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-highlight" />
                  Rental homes across Cameroon
                </div>
                <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-6xl">
                  Find your next home, faster.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-primary-foreground/82 sm:text-lg sm:leading-8">
                  Discover available rental houses near you and reach the landlord straight away by
                  phone or WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-10 sm:py-14">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Recent listings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Freshly added houses, newest first.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/houses">See all</Link>
            </Button>
          </div>

          <CachedNotice show={isFromCache} />

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <HouseCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : recent.length === 0 ? (
            <EmptyState
              title="No houses yet"
              description="Listings will appear here as soon as landlords add them."
              action={
                <Button asChild>
                  <Link to="/landlord/register">Add the first house</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((house) => (
                <HouseCard key={house.id} house={house} />
              ))}
            </div>
          )}
        </section>

        <section className="border-y border-border bg-card/70 py-10 backdrop-blur-sm sm:py-14">
          <div className="container-page">
            <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
              How it works
            </h2>
            <div className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-3">
              {[
                {
                  icon: Home,
                  title: "Browse available homes",
                  text: "Open the latest listings and compare the homes that are available now.",
                },
                {
                  icon: Eye,
                  title: "View the property",
                  text: "See every photo, the rooms, water and electricity details.",
                },
                {
                  icon: Phone,
                  title: "Contact the landlord",
                  text: "Call or message on WhatsApp in one tap — no middleman.",
                },
              ].map((step, i) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
