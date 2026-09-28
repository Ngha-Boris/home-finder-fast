import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, CalendarDays, Heart, MapPin } from "lucide-react";
import type { MouseEvent } from "react";
import { toast } from "sonner";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-auth";
import { coverImage, formatPrice, type House } from "@/lib/houses-types";
import { fetchFavoriteIds, setFavoriteHouse } from "@/lib/houses-api";
import { getSessionFavoriteIds, setSessionFavoriteHouse } from "@/lib/session-favorites";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function HouseCard({ house }: { house: House }) {
  const cover = coverImage(house);
  const { user } = useSession();
  const qc = useQueryClient();
  const { t, houseType, formatDate } = useI18n();
  const typeLabel = houseType(house.house_type);
  const favoritesOwner = user?.id ?? "session";
  const favoritesQueryKey = ["favorites", favoritesOwner] as const;

  const favorites = useQuery({
    queryKey: favoritesQueryKey,
    queryFn: () => (user ? fetchFavoriteIds(user.id) : getSessionFavoriteIds()),
  });
  const isFavorite = !!favorites.data?.includes(house.id);

  const favoriteMutation = useMutation({
    mutationFn: (nextFavorite: boolean) =>
      user
        ? setFavoriteHouse(user.id, house.id, nextFavorite)
        : Promise.resolve(setSessionFavoriteHouse(house.id, nextFavorite)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: favoritesQueryKey });
      qc.invalidateQueries({ queryKey: ["favorite-houses", favoritesOwner] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    favoriteMutation.mutate(!isFavorite);
  };

  return (
    <Card className="group relative flex min-w-0 flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-card-hover">
      <Link
        to="/houses/$id"
        params={{ id: house.id }}
        className="block min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative block aspect-[4/3] overflow-hidden bg-secondary">
          {cover ? (
            <StorageImage
              image={cover}
              alt={t("listing.title", { type: typeLabel, location: house.location })}
              loading="lazy"
              width={800}
              height={600}
              sizes="(max-width: 430px) 100vw, (max-width: 1024px) 50vw, 24rem"
              responsiveWidths={[320, 480, 640, 800]}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("common.noPhoto")}
            </div>
          )}
          <Badge
            className="absolute left-2 top-2 max-w-[calc(100%-4.5rem)] border-white/40 bg-card/90 text-card-foreground shadow-sm backdrop-blur sm:left-3 sm:top-3"
            variant="secondary"
          >
            <span className="truncate">{typeLabel}</span>
          </Badge>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
          <div>
            <p className="break-words font-display text-lg font-extrabold text-foreground sm:text-xl">
              {formatPrice(house.rent_price)}
            </p>
            <p className="text-xs text-muted-foreground">{t("common.perMonth")}</p>
          </div>
          <p className="flex min-w-0 items-start gap-1.5 text-sm font-medium">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-words">
              {house.location}
              <span className="text-muted-foreground"> · {house.region}</span>
            </span>
          </p>
          <p className="line-clamp-2 break-words text-sm text-muted-foreground">
            {house.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:gap-x-4">
            {house.rooms ? (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {house.rooms} {house.rooms > 1 ? t("card.rooms") : t("card.room")}
              </span>
            ) : null}
            {house.bathrooms ? (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {house.bathrooms} {t("common.bathrooms").toLowerCase()}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(house.created_at)}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label={isFavorite ? t("common.saved") : t("detail.saveHouse")}
        disabled={favoriteMutation.isPending}
        onClick={toggleFavorite}
        className={cn(
          "absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-card/90 text-foreground shadow-sm backdrop-blur transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 sm:right-3 sm:top-3",
          isFavorite && "bg-primary text-primary-foreground",
        )}
      >
        <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
      </button>
    </Card>
  );
}

export function HouseCardSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </Card>
  );
}
