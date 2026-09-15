import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, CalendarDays, MapPin } from "lucide-react";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { coverImage, formatPrice, type House } from "@/lib/houses-types";
import { useI18n } from "@/lib/i18n";

export function HouseCard({ house }: { house: House }) {
  const cover = coverImage(house);
  const { t, houseType, formatDate } = useI18n();
  const typeLabel = houseType(house.house_type);
  return (
    <Card className="group flex min-w-0 flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-card-hover">
      <Link
        to="/houses/$id"
        params={{ id: house.id }}
        className="relative block aspect-[4/3] overflow-hidden bg-secondary"
      >
        {cover ? (
          <StorageImage
            image={cover}
            alt={t("listing.title", { type: typeLabel, location: house.location })}
            loading="lazy"
            width={800}
            height={600}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 24rem"
            responsiveWidths={[320, 480, 640, 800]}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("common.noPhoto")}
          </div>
        )}
        <Badge
          className="absolute left-2 top-2 max-w-[calc(100%-1rem)] border-white/40 bg-card/90 text-card-foreground shadow-sm backdrop-blur sm:left-3 sm:top-3"
          variant="secondary"
        >
          <span className="truncate">{typeLabel}</span>
        </Badge>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 min-[375px]:p-4">
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
        <Button asChild className="mt-auto h-11 w-full">
          <Link to="/houses/$id" params={{ id: house.id }}>
            {t("card.viewDetails")}
          </Link>
        </Button>
      </div>
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
