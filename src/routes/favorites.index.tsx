import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { HouseCard, HouseCardSkeleton } from "@/components/house-card";
import { OfflineBanner } from "@/components/offline-banner";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, ErrorState } from "@/components/states";
import { useSession } from "@/hooks/use-auth";
import { fetchAvailableHousesByIds, fetchFavoriteHouses } from "@/lib/houses-api";
import { useI18n } from "@/lib/i18n";
import { getSessionFavoriteIds } from "@/lib/session-favorites";

export const Route = createFileRoute("/favorites/")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Favorite houses — Easy Rent" }],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user, loading } = useSession();
  const { t } = useI18n();
  const favoritesOwner = user?.id ?? "session";
  const favorites = useQuery({
    queryKey: ["favorite-houses", favoritesOwner],
    queryFn: () =>
      user ? fetchFavoriteHouses(user.id) : fetchAvailableHousesByIds(getSessionFavoriteIds()),
    enabled: !loading,
  });

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />
      <OfflineBanner />
      <main className="container-page flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-4 sm:py-8">
        <div className="mb-5 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-extrabold">{t("favorites.pageTitle")}</h1>
        </div>

        {loading || favorites.isPending ? (
          <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <HouseCardSkeleton key={index} />
            ))}
          </div>
        ) : favorites.isError ? (
          <ErrorState onRetry={() => void favorites.refetch()} />
        ) : favorites.data.length === 0 ? (
          <EmptyState
            title={t("favorites.emptyTitle")}
            description={t("favorites.emptyDescription")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {favorites.data.map((house) => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
