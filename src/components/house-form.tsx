import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useOnline } from "@/hooks/use-online";
import {
  createHouse,
  deleteImage,
  insertImages,
  reorderHouseImages,
  setCoverImage,
  updateHouse,
  uploadHouseImage,
} from "@/lib/houses-api";
import {
  HOUSE_TYPES,
  REGIONS,
  sortedImages,
  type House,
  type HouseImageRow,
  type HouseType,
} from "@/lib/houses-types";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, compressImage } from "@/lib/image-compress";
import { useI18n } from "@/lib/i18n";
import { isValidLocalPhone, normalizePhone, phoneInputValue } from "@/lib/phone";

type Pending = { id: string; file: File; url: string };
type PhotoItem =
  | { kind: "existing"; id: string; image: HouseImageRow }
  | { kind: "pending"; id: string; pending: Pending };
const MAX_PHOTOS = 10;

function looksLikeQualityDescription(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const letters = value.replace(/[^a-z]/gi, "");
  const uniqueLetters = new Set(letters.toLowerCase()).size;
  const longestRun = value.match(/(.)\1{4,}/);

  return words.length >= 8 && uniqueLetters >= 8 && !longestRun;
}

export function HouseForm({
  userId,
  defaultPhone,
  house,
}: {
  userId: string;
  defaultPhone: string;
  house?: House;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnline();
  const { t, houseType: houseTypeLabel } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const [houseType, setHouseType] = useState<HouseType>(house?.house_type ?? "studio_apartment");
  const [rent, setRent] = useState(house ? String(house.rent_price) : "");
  const [region, setRegion] = useState(house?.region ?? "");
  const [location, setLocation] = useState(house?.location ?? "");
  const [description, setDescription] = useState(house?.description ?? "");
  const [phone, setPhone] = useState(
    phoneInputValue(house?.contact_phone) || phoneInputValue(defaultPhone),
  );
  const [rooms, setRooms] = useState(house?.rooms ? String(house.rooms) : "");
  const [bathrooms, setBathrooms] = useState(house?.bathrooms ? String(house.bathrooms) : "");
  const [hasWater, setHasWater] = useState(house?.has_water ?? true);
  const [hasElectricity, setHasElectricity] = useState(house?.has_electricity ?? true);
  const [amenities, setAmenities] = useState((house?.amenities ?? []).join(", "));
  const [locationDetails, setLocationDetails] = useState(house?.location_details ?? "");
  const [available, setAvailable] = useState((house?.availability ?? "available") === "available");

  const [existing, setExisting] = useState<HouseImageRow[]>(house ? sortedImages(house) : []);
  const [pending, setPending] = useState<Pending[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const photos: PhotoItem[] = [
    ...existing.map((image) => ({ kind: "existing" as const, id: image.id, image })),
    ...pending.map((item) => ({ kind: "pending" as const, id: item.id, pending: item })),
  ];

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.url)), [pending]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Pending[] = [];
    const remainingSlots = MAX_PHOTOS - existing.length - pending.length;
    if (remainingSlots <= 0) {
      toast.error(t("form.maxPhotos", { max: MAX_PHOTOS }));
      return;
    }
    for (const file of Array.from(files)) {
      if (next.length >= remainingSlots) {
        toast.error(
          t("form.remainingPhotos", {
            count: remainingSlots,
            noun: remainingSlots === 1 ? t("form.photoSingular") : t("form.photoPlural"),
            plural: remainingSlots === 1 ? "" : "s",
          }),
        );
        break;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(t("form.invalidType", { name: file.name }));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(t("form.tooLarge", { name: file.name }));
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    setPending((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const syncPhotoOrder = async (items: PhotoItem[], previousExisting: HouseImageRow[]) => {
    const nextExisting = items
      .filter((item): item is Extract<PhotoItem, { kind: "existing" }> => item.kind === "existing")
      .map((item) => ({
        ...item.image,
        sort_order: items.findIndex((candidate) => candidate.id === item.id),
        is_cover: items[0]?.id === item.id,
      }));
    const nextPending = items
      .filter((item): item is Extract<PhotoItem, { kind: "pending" }> => item.kind === "pending")
      .map((item) => item.pending);

    setExisting(nextExisting);
    setPending(nextPending);

    if (!house || !nextExisting.length) return;
    if (!online) {
      setExisting(previousExisting);
      toast.error(t("common.offlineAction"));
      return;
    }

    try {
      const saved = await reorderHouseImages(
        house.id,
        nextExisting.map((image) => image.id),
      );
      setExisting(sortedImages({ ...house, house_images: saved }));
    } catch (error) {
      setExisting(previousExisting);
      toast.error((error as Error).message);
    }
  };

  const movePhoto = (id: string, delta: -1 | 1) => {
    if (saving) return;
    const index = photos.findIndex((photo) => photo.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target]!, next[index]!];
    void syncPhotoOrder(next, existing);
  };

  const removePending = (id: string) => {
    setPending((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return p.filter((x) => x.id !== id);
    });
  };

  const removeExisting = async (image: HouseImageRow) => {
    if (!online) {
      toast.error(t("common.offlineAction"));
      return;
    }
    try {
      await deleteImage(image);
      const remaining = existing.filter((i) => i.id !== image.id);
      if (image.is_cover && house && remaining.length) {
        await setCoverImage(house.id, remaining[0]!.id);
        remaining[0] = { ...remaining[0]!, is_cover: true };
      }
      setExisting(remaining);
      toast.success(t("form.photoRemoved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const makeCover = async (image: HouseImageRow) => {
    if (!house) return;
    if (!online) {
      toast.error(t("common.offlineAction"));
      return;
    }
    try {
      await setCoverImage(house.id, image.id);
      setExisting((imgs) => imgs.map((i) => ({ ...i, is_cover: i.id === image.id })));
      toast.success(t("form.mainUpdated"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const rentNumber = Number(rent);
    if (!Number.isFinite(rentNumber) || rentNumber <= 0) next["rent"] = t("form.validation.rent");
    if (!region) next["region"] = t("form.validation.region");
    if (location.trim().length < 3) next["location"] = t("form.validation.location");
    if (!looksLikeQualityDescription(description)) {
      next["description"] = t("form.validation.description");
    }
    if (!isValidLocalPhone(phone)) next["phone"] = t("form.validation.phone");
    if (rooms && (!Number.isInteger(Number(rooms)) || Number(rooms) < 0)) {
      next["rooms"] = t("form.validation.wholeNumber");
    }
    if (bathrooms && (!Number.isInteger(Number(bathrooms)) || Number(bathrooms) < 0)) {
      next["bathrooms"] = t("form.validation.wholeNumber");
    }
    if (existing.length + pending.length === 0) next["photos"] = t("form.validation.photos");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!online) {
      toast.error(t("common.offlineAction"));
      return;
    }
    if (!validate()) return;

    setSaving(true);
    setProgress(5);
    try {
      const payload = {
        house_type: houseType,
        rent_price: Number(rent),
        region,
        location: location.trim(),
        description: description.trim(),
        contact_phone: normalizePhone(phone)!,
        rooms: rooms ? Number(rooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        has_water: hasWater,
        has_electricity: hasElectricity,
        amenities: amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        location_details: locationDetails.trim() || null,
        availability: (available ? "available" : "unavailable") as "available" | "unavailable",
      };

      let houseId = house?.id;
      if (house) {
        await updateHouse(house.id, payload);
      } else {
        const created = await createHouse({ ...payload, landlord_id: userId });
        houseId = created.id;
      }

      if (pending.length && houseId) {
        const rows = [];
        for (let i = 0; i < pending.length; i++) {
          const pendingId = pending[i]!.id;
          const pendingIndex = photos.findIndex(
            (photo) => photo.kind === "pending" && photo.id === pendingId,
          );
          const sortOrder = pendingIndex >= 0 ? pendingIndex : existing.length + i;
          const blob = await compressImage(pending[i]!.file);
          const uploaded = await uploadHouseImage(userId, blob);
          rows.push({
            house_id: houseId,
            ...uploaded,
            is_cover: existing.length === 0 && sortOrder === 0,
            sort_order: sortOrder,
          });
          setProgress(10 + Math.round(((i + 1) / pending.length) * 85));
        }
        const inserted = await insertImages(rows);
        const insertedByPendingId = new Map(
          pending.map((item, index) => [item.id, inserted[index]]),
        );
        const finalImageIds = photos
          .map((photo) =>
            photo.kind === "existing" ? photo.image.id : insertedByPendingId.get(photo.id)?.id,
          )
          .filter((id): id is string => Boolean(id));
        if (finalImageIds.length === existing.length + inserted.length) {
          await reorderHouseImages(houseId, finalImageIds);
        }
      }

      setProgress(100);
      qc.invalidateQueries({ queryKey: ["my-houses"] });
      qc.invalidateQueries({ queryKey: ["houses"] });
      toast.success(house ? t("form.listingUpdated") : t("form.houseAdded"));
      navigate({ to: "/landlord/listings" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 sm:space-y-6">
      <Card className="space-y-5 border-white/70 p-3 shadow-card min-[375px]:p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">{t("form.propertyDetails")}</h2>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="space-y-1.5">
            <Label>{t("houses.houseType")} *</Label>
            <Select value={houseType} onValueChange={(v) => setHouseType(v as HouseType)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUSE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {houseTypeLabel(t.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rent">{t("form.monthlyRent")}</Label>
            <Input
              id="rent"
              type="number"
              inputMode="numeric"
              min={1}
              className="h-11"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              aria-invalid={!!errors["rent"]}
            />
            {errors["rent"] ? <p className="text-xs text-destructive">{errors["rent"]}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>{t("common.region")} *</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-11" aria-invalid={!!errors["region"]}>
                <SelectValue placeholder={t("form.selectRegion")} />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors["region"] ? (
              <p className="text-xs text-destructive">{errors["region"]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">{t("form.location")}</Label>
            <Input
              id="location"
              className="h-11"
              placeholder={t("form.locationPlaceholder")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-invalid={!!errors["location"]}
            />
            {errors["location"] ? (
              <p className="text-xs text-destructive">{errors["location"]}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">{t("form.description")}</Label>
          <Textarea
            id="description"
            rows={5}
            placeholder={t("form.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={!!errors["description"]}
          />
          {errors["description"] ? (
            <p className="text-xs text-destructive">{errors["description"]}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact">{t("form.contactPhone")}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              +237
            </span>
            <Input
              id="contact"
              inputMode="numeric"
              className="h-11 pl-14"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors["phone"]}
            />
          </div>
          {errors["phone"] ? <p className="text-xs text-destructive">{errors["phone"]}</p> : null}
        </div>

        <label className="flex items-center gap-3">
          <Switch checked={available} onCheckedChange={setAvailable} />
          <span className="text-sm font-medium">
            {available ? t("form.availableToRent") : t("form.notCurrentlyAvailable")}
          </span>
        </label>
      </Card>

      <Card className="space-y-5 border-white/70 p-3 shadow-card min-[375px]:p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">{t("form.extraDetails")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="rooms">{t("form.numberOfRooms")}</Label>
            <Input
              id="rooms"
              type="number"
              min={0}
              className="h-11"
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              aria-invalid={!!errors["rooms"]}
            />
            {errors["rooms"] ? <p className="text-xs text-destructive">{errors["rooms"]}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baths">{t("common.bathrooms")}</Label>
            <Input
              id="baths"
              type="number"
              min={0}
              className="h-11"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              aria-invalid={!!errors["bathrooms"]}
            />
            {errors["bathrooms"] ? (
              <p className="text-xs text-destructive">{errors["bathrooms"]}</p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:gap-6">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <Checkbox checked={hasWater} onCheckedChange={(v) => setHasWater(!!v)} />
            {t("form.waterAvailable")}
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <Checkbox checked={hasElectricity} onCheckedChange={(v) => setHasElectricity(!!v)} />
            {t("form.electricityAvailable")}
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amenities">{t("form.amenities")}</Label>
          <Input
            id="amenities"
            className="h-11"
            placeholder={t("form.amenitiesPlaceholder")}
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-details">{t("form.locationDetails")}</Label>
          <Textarea
            id="loc-details"
            rows={3}
            placeholder={t("form.locationDetailsPlaceholder")}
            value={locationDetails}
            onChange={(e) => setLocationDetails(e.target.value)}
          />
        </div>
      </Card>

      <Card className="space-y-4 border-white/70 p-3 shadow-card min-[375px]:p-4 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">{t("form.photos")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("form.photosHelp", { max: MAX_PHOTOS })}
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full sm:w-auto"
          disabled={saving}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {t("form.choosePhotos")}
        </Button>
        {errors["photos"] ? <p className="text-xs text-destructive">{errors["photos"]}</p> : null}

        {photos.length ? (
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:gap-3 md:grid-cols-4">
            {photos.map((photo, index) =>
              photo.kind === "existing" ? (
                <div
                  key={photo.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-secondary"
                >
                  <StorageImage
                    image={photo.image}
                    alt={t("gallery.show", { number: index + 1 })}
                    loading="lazy"
                    width={320}
                    height={240}
                    sizes="(max-width: 640px) 50vw, 12rem"
                    responsiveWidths={[160, 240, 320]}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {photo.image.is_cover ? (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-highlight px-1.5 py-0.5 text-[10px] font-semibold text-highlight-foreground">
                      {t("form.main")}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute left-1.5 top-1.5 h-7 w-7"
                      onClick={() => void makeCover(photo.image)}
                      aria-label={t("form.setMain")}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute right-1.5 top-1.5 h-7 w-7"
                    onClick={() => void removeExisting(photo.image)}
                    aria-label={t("form.removePhoto")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      disabled={saving || index === 0}
                      onClick={() => movePhoto(photo.id, -1)}
                      aria-label={t("form.moveLeft")}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      disabled={saving || index === photos.length - 1}
                      onClick={() => movePhoto(photo.id, 1)}
                      aria-label={t("form.moveRight")}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-xl border border-dashed border-primary/50 bg-secondary"
                >
                  <img
                    src={photo.pending.url}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute right-1.5 top-1.5 h-7 w-7"
                    onClick={() => removePending(photo.id)}
                    aria-label={t("form.removePhoto")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      disabled={saving || index === 0}
                      onClick={() => movePhoto(photo.id, -1)}
                      aria-label={t("form.moveLeft")}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      disabled={saving || index === photos.length - 1}
                      onClick={() => movePhoto(photo.id, 1)}
                      aria-label={t("form.moveRight")}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}

        {saving && pending.length ? <Progress value={progress} className="h-2" /> : null}
      </Card>

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Button type="submit" size="lg" className="h-12 w-full sm:w-auto" disabled={saving}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {saving ? t("form.saving") : house ? t("form.saveChanges") : t("form.publishHouse")}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12 w-full sm:w-auto"
          onClick={() => navigate({ to: "/landlord/listings" })}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
