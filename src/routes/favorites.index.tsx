import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { HouseCard, HouseCardSkeleton } from "@/components/house-card";
import { OfflineBanner } from "@/components/offline-banner";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, ErrorState } from "@/components/states";
import { useSession } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchFavoriteHouses } from "@/lib/houses-api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/favorites/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/landlord/login" });
  },
  head: () => ({
    meta: [{ title: "Favorite houses — Easy Rent" }],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useSession();
  const { t } = useI18n();
  const favorites = useQuery({
    queryKey: ["favorite-houses", user?.id],
    queryFn: () => fetchFavoriteHouses(user!.id),
    enabled: !!user,
  });

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />
      <OfflineBanner />
      <main className="container-page flex-1 pb-24 pt-5 sm:py-8">
        <div className="mb-5 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-extrabold">{t("favorites.pageTitle")}</h1>
        </div>

        {favorites.isPending ? (
          <div className="grid grid-cols-2 gap-2 min-[375px]:gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
          <div className="grid grid-cols-2 gap-2 min-[375px]:gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {favorites.data.map((house) => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
