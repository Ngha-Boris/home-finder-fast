import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Droplets,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Flag,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ImageGallery } from "@/components/image-gallery";
import { CachedNotice, OfflineBanner } from "@/components/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useSession } from "@/hooks/use-auth";
import {
  fetchFavoriteIds,
  fetchHouse,
  logContactEvent,
  reportListing,
  setFavoriteHouse,
  type ListingReportReason,
} from "@/lib/houses-api";
import { formatPrice, sortedImages } from "@/lib/houses-types";
import { CACHE_KEYS } from "@/lib/idb-cache";
import { useI18n } from "@/lib/i18n";
import { formatPhoneDisplay, telLink, whatsappLink } from "@/lib/phone";

export const Route = createFileRoute("/houses/$id")({
  head: () => ({
    meta: [
      { title: "House details — Easy Rent" },
      {
        name: "description",
        content:
          "See photos, rent, location and amenities for this rental house, then call or WhatsApp the landlord directly.",
      },
      { property: "og:title", content: "House details — Easy Rent" },
      {
        property: "og:description",
        content: "Photos, rent, location and direct landlord contact for this rental house.",
      },
    ],
  }),
  component: HouseDetailsPage,
});

function HouseDetailsPage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ListingReportReason>("wrong_information");
  const [reportDetails, setReportDetails] = useState("");
  const { t, houseType, formatDate } = useI18n();
  const { data, isLoading, isError, isFromCache, refetch } = useCachedQuery({
    queryKey: ["houses", "detail", id],
    cacheKey: CACHE_KEYS.house(id),
    queryFn: () => fetchHouse(id),
  });
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => fetchFavoriteIds(user!.id),
    enabled: !!user,
  });

  const house = data ?? null;
  const isFavorite = !!favorites.data?.includes(id);

  const favoriteMutation = useMutation({
    mutationFn: () => setFavoriteHouse(user!.id, id, !isFavorite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] });
      toast.success(isFavorite ? t("detail.removedSavedToast") : t("detail.savedToast"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      reportListing({
        houseId: id,
        reporterUserId: user?.id ?? null,
        reason: reportReason,
        details: reportDetails,
      }),
    onSuccess: () => {
      setReportOpen(false);
      setReportDetails("");
      toast.success(t("detail.reportedToast"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />
      <OfflineBanner />

      <main className="container-page flex-1 pb-24 pt-4 sm:py-6">
        <Button asChild variant="ghost" className="-ml-2 mb-3 sm:mb-4">
          <Link to="/houses">
            <ArrowLeft className="h-4 w-4" />
            {t("detail.back")}
          </Link>
        </Button>

        <CachedNotice show={isFromCache} />

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !house ? (
          <ErrorState message={t("detail.gone")} />
        ) : (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)] lg:gap-8">
            <div className="min-w-0">
              <ImageGallery
                images={sortedImages(house)}
                alt={t("listing.title", {
                  type: houseType(house.house_type),
                  location: house.location,
                })}
              />

              <div className="mt-6 space-y-6 sm:mt-8">
                <div>
                  <h2 className="font-display text-xl font-bold">{t("detail.about")}</h2>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground sm:text-base">
                    {house.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {house.rooms ? (
                    <Fact icon={BedDouble} label={t("common.rooms")} value={String(house.rooms)} />
                  ) : null}
                  {house.bathrooms ? (
                    <Fact
                      icon={Bath}
                      label={t("common.bathrooms")}
                      value={String(house.bathrooms)}
                    />
                  ) : null}
                  <Fact
                    icon={Droplets}
                    label={t("common.water")}
                    value={house.has_water ? t("common.available") : t("common.notAvailable")}
                  />
                  <Fact
                    icon={Zap}
                    label={t("common.electricity")}
                    value={house.has_electricity ? t("common.available") : t("common.notAvailable")}
                  />
                  <Fact
                    icon={CalendarDays}
                    label={t("common.listed")}
                    value={formatDate(house.created_at)}
                  />
                </div>

                {house.amenities.length ? (
                  <div>
                    <h3 className="font-display text-lg font-semibold">{t("detail.amenities")}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {house.amenities.map((a) => (
                        <Badge key={a} variant="secondary" className="px-3 py-1 text-sm">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {house.location_details ? (
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      {t("detail.gettingThere")}
                    </h3>
                    <p className="mt-1 break-words text-sm leading-6 text-muted-foreground sm:text-base">
                      {house.location_details}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <Card className="space-y-5 border-white/70 p-4 shadow-card sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{houseType(house.house_type)}</Badge>
                  <Badge
                    className={
                      house.availability === "available"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {house.availability === "available"
                      ? t("common.available")
                      : t("common.unavailable")}
                  </Badge>
                </div>

                <div>
                  <p className="break-words font-display text-2xl font-extrabold text-foreground sm:text-3xl">
                    {formatPrice(house.rent_price)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("common.perMonth")}</p>
                </div>

                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium">{house.location}</span>
                    <br />
                    <span className="text-muted-foreground">
                      {house.region} {t("common.region")}
                    </span>
                  </span>
                </p>

                <div className="space-y-2 border-t border-border pt-5">
                  <p className="text-sm font-medium">{t("detail.contactLandlord")}</p>
                  <p className="break-words text-sm text-muted-foreground">
                    {formatPhoneDisplay(house.contact_phone)}
                  </p>
                  <Button asChild size="lg" className="h-12 w-full">
                    <a
                      href={telLink(house.contact_phone)}
                      onClick={() => void logContactEvent(house.id, "call")}
                    >
                      <Phone className="h-5 w-5" />
                      {t("detail.call")}
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="whatsapp" className="h-12 w-full">
                    <a
                      href={whatsappLink(
                        house.contact_phone,
                        t("detail.whatsappMessage", {
                          type: houseType(house.house_type).toLowerCase(),
                          location: house.location,
                        }),
                      )}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void logContactEvent(house.id, "whatsapp")}
                    >
                      <MessageCircle className="h-5 w-5" />
                      {t("detail.whatsapp")}
                    </a>
                  </Button>
                </div>

                <div className="space-y-2 border-t border-border pt-5">
                  {user ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      disabled={favoriteMutation.isPending}
                      onClick={() => favoriteMutation.mutate()}
                    >
                      <Star className="h-4 w-4" />
                      {isFavorite ? t("common.saved") : t("detail.saveHouse")}
                    </Button>
                  ) : null}

                  <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" className="h-11 w-full">
                        <Flag className="h-4 w-4" />
                        {t("detail.reportListing")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("detail.reportTitle")}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>{t("detail.reason")}</Label>
                          <Select
                            value={reportReason}
                            onValueChange={(value) => setReportReason(value as ListingReportReason)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="wrong_information">
                                {t("detail.reasonWrong")}
                              </SelectItem>
                              <SelectItem value="unreachable_landlord">
                                {t("detail.reasonUnreachable")}
                              </SelectItem>
                              <SelectItem value="fraud_or_scam">
                                {t("detail.reasonFraud")}
                              </SelectItem>
                              <SelectItem value="already_rented">
                                {t("detail.reasonRented")}
                              </SelectItem>
                              <SelectItem value="spam">{t("detail.reasonSpam")}</SelectItem>
                              <SelectItem value="other">{t("detail.reasonOther")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="report-details">{t("detail.details")}</Label>
                          <Textarea
                            id="report-details"
                            rows={4}
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          disabled={reportMutation.isPending}
                          onClick={() => reportMutation.mutate()}
                        >
                          {t("detail.submitReport")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/90 px-4 py-3 shadow-sm">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
