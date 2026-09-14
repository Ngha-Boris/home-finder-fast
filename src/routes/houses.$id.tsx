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
import { formatDate, formatPrice, houseTypeLabel, sortedImages } from "@/lib/houses-types";
import { CACHE_KEYS } from "@/lib/idb-cache";
import { formatPhoneDisplay, telLink, whatsappLink } from "@/lib/phone";

export const Route = createFileRoute("/houses/$id")({
  head: () => ({
    meta: [
      { title: "House details — Nyumba" },
      {
        name: "description",
        content:
          "See photos, rent, location and amenities for this rental house, then call or WhatsApp the landlord directly.",
      },
      { property: "og:title", content: "House details — Nyumba" },
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
      toast.success(isFavorite ? "Removed from saved houses" : "Saved house");
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
      toast.success("Thanks. The listing was reported for review.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <OfflineBanner />

      <main className="container-page flex-1 py-6">
        <Button asChild variant="ghost" className="-ml-2 mb-4">
          <Link to="/houses">
            <ArrowLeft className="h-4 w-4" />
            Back to houses
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
          <ErrorState message="This listing is no longer available." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <ImageGallery
                images={sortedImages(house)}
                alt={`${houseTypeLabel(house.house_type)} in ${house.location}`}
              />

              <div className="mt-8 space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold">About this property</h2>
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">
                    {house.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {house.rooms ? (
                    <Fact icon={BedDouble} label="Rooms" value={String(house.rooms)} />
                  ) : null}
                  {house.bathrooms ? (
                    <Fact icon={Bath} label="Bathrooms" value={String(house.bathrooms)} />
                  ) : null}
                  <Fact
                    icon={Droplets}
                    label="Water"
                    value={house.has_water ? "Available" : "Not available"}
                  />
                  <Fact
                    icon={Zap}
                    label="Electricity"
                    value={house.has_electricity ? "Available" : "Not available"}
                  />
                  <Fact icon={CalendarDays} label="Listed" value={formatDate(house.created_at)} />
                </div>

                {house.amenities.length ? (
                  <div>
                    <h3 className="font-display text-lg font-semibold">Amenities</h3>
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
                    <h3 className="font-display text-lg font-semibold">Getting there</h3>
                    <p className="mt-1 text-muted-foreground">{house.location_details}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="space-y-5 p-6 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{houseTypeLabel(house.house_type)}</Badge>
                  <Badge
                    className={
                      house.availability === "available"
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {house.availability === "available" ? "Available" : "Unavailable"}
                  </Badge>
                </div>

                <div>
                  <p className="font-display text-3xl font-extrabold text-primary">
                    {formatPrice(house.rent_price)}
                  </p>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>

                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">{house.location}</span>
                    <br />
                    <span className="text-muted-foreground">{house.region} Region</span>
                  </span>
                </p>

                <div className="space-y-2 border-t border-border pt-5">
                  <p className="text-sm font-medium">Contact the landlord</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhoneDisplay(house.contact_phone)}
                  </p>
                  <Button asChild size="lg" className="h-12 w-full">
                    <a
                      href={telLink(house.contact_phone)}
                      onClick={() => void logContactEvent(house.id, "call")}
                    >
                      <Phone className="h-5 w-5" />
                      Call Landlord
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="whatsapp" className="h-12 w-full">
                    <a
                      href={whatsappLink(
                        house.contact_phone,
                        `Hello, I saw your ${houseTypeLabel(house.house_type).toLowerCase()} in ${house.location} on Nyumba. Is it still available?`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void logContactEvent(house.id, "whatsapp")}
                    >
                      <MessageCircle className="h-5 w-5" />
                      Chat on WhatsApp
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
                      {isFavorite ? "Saved" : "Save house"}
                    </Button>
                  ) : null}

                  <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" className="h-11 w-full">
                        <Flag className="h-4 w-4" />
                        Report listing
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report this listing</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Reason</Label>
                          <Select
                            value={reportReason}
                            onValueChange={(value) => setReportReason(value as ListingReportReason)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="wrong_information">Wrong information</SelectItem>
                              <SelectItem value="unreachable_landlord">
                                Landlord unreachable
                              </SelectItem>
                              <SelectItem value="fraud_or_scam">Fraud or scam</SelectItem>
                              <SelectItem value="already_rented">Already rented</SelectItem>
                              <SelectItem value="spam">Spam</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="report-details">Details</Label>
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
                          Submit report
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
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
