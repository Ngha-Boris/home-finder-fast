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
  setCoverImage,
  updateHouse,
  updateHouseImageOrder,
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
import { isValidLocalPhone, normalizePhone, phoneInputValue } from "@/lib/phone";

type Pending = { id: string; file: File; url: string };
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

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.url)), [pending]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Pending[] = [];
    const remainingSlots = MAX_PHOTOS - existing.length - pending.length;
    if (remainingSlots <= 0) {
      toast.error(`You can add up to ${MAX_PHOTOS} photos per listing.`);
      return;
    }
    for (const file of Array.from(files)) {
      if (next.length >= remainingSlots) {
        toast.error(`Only ${remainingSlots} more photo${remainingSlots === 1 ? "" : "s"} allowed.`);
        break;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG or WebP photos are allowed.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name}: photo is larger than 8 MB.`);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    setPending((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const movePending = (id: string, delta: -1 | 1) => {
    setPending((items) => {
      const index = items.findIndex((item) => item.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const moveExisting = async (imageId: string, delta: -1 | 1) => {
    const index = existing.findIndex((image) => image.id === imageId);
    const target = index + delta;
    if (!house || index < 0 || target < 0 || target >= existing.length) return;
    const next = [...existing];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const reordered = next.map((image, sort_order) => ({
      ...image,
      sort_order,
      is_cover: sort_order === 0,
    }));
    setExisting(reordered);
    try {
      await Promise.all(
        reordered.map((image) =>
          updateHouseImageOrder(image.id, image.sort_order, image.is_cover, house.id),
        ),
      );
    } catch (error) {
      setExisting(existing);
      toast.error((error as Error).message);
    }
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
      toast.error("This action requires an internet connection.");
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
      toast.success("Photo removed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const makeCover = async (image: HouseImageRow) => {
    if (!house) return;
    if (!online) {
      toast.error("This action requires an internet connection.");
      return;
    }
    try {
      await setCoverImage(house.id, image.id);
      setExisting((imgs) => imgs.map((i) => ({ ...i, is_cover: i.id === image.id })));
      toast.success("Main photo updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const rentNumber = Number(rent);
    if (!Number.isFinite(rentNumber) || rentNumber <= 0)
      next["rent"] = "Enter a valid monthly rent.";
    if (!region) next["region"] = "Choose a region.";
    if (location.trim().length < 3) next["location"] = "Enter the neighbourhood or town.";
    if (!looksLikeQualityDescription(description)) {
      next["description"] =
        "Write at least 8 clear words describing the property, not placeholder text.";
    }
    if (!isValidLocalPhone(phone)) next["phone"] = "Enter a valid 9-digit phone number.";
    if (rooms && (!Number.isInteger(Number(rooms)) || Number(rooms) < 0)) {
      next["rooms"] = "Enter a whole number.";
    }
    if (bathrooms && (!Number.isInteger(Number(bathrooms)) || Number(bathrooms) < 0)) {
      next["bathrooms"] = "Enter a whole number.";
    }
    if (existing.length + pending.length === 0) next["photos"] = "Add at least one photo.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!online) {
      toast.error("This action requires an internet connection.");
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
          const blob = await compressImage(pending[i]!.file);
          const uploaded = await uploadHouseImage(userId, blob);
          rows.push({
            house_id: houseId,
            ...uploaded,
            is_cover: existing.length === 0 && i === 0,
            sort_order: existing.length + i,
          });
          setProgress(10 + Math.round(((i + 1) / pending.length) * 85));
        }
        await insertImages(rows);
      }

      setProgress(100);
      qc.invalidateQueries({ queryKey: ["my-houses"] });
      qc.invalidateQueries({ queryKey: ["houses"] });
      toast.success(house ? "Listing updated" : "House added");
      navigate({ to: "/landlord/listings" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 sm:space-y-6">
      <Card className="space-y-5 border-white/70 p-4 shadow-card sm:p-6">
        <h2 className="font-display text-lg font-semibold">Property details</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>House type *</Label>
            <Select value={houseType} onValueChange={(v) => setHouseType(v as HouseType)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUSE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rent">Monthly rent (FCFA) *</Label>
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
            <Label>Region *</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-11" aria-invalid={!!errors["region"]}>
                <SelectValue placeholder="Select a region" />
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
            <Label htmlFor="location">Neighbourhood / town *</Label>
            <Input
              id="location"
              className="h-11"
              placeholder="Neighbourhood and city"
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
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            rows={5}
            placeholder="Describe the house, the compound and what makes it a good place to live."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={!!errors["description"]}
          />
          {errors["description"] ? (
            <p className="text-xs text-destructive">{errors["description"]}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact">Contact phone *</Label>
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
            {available ? "Available to rent" : "Not currently available"}
          </span>
        </label>
      </Card>

      <Card className="space-y-5 border-white/70 p-4 shadow-card sm:p-6">
        <h2 className="font-display text-lg font-semibold">Extra details (optional)</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rooms">Number of rooms</Label>
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
            <Label htmlFor="baths">Bathrooms</Label>
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
            Water available
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <Checkbox checked={hasElectricity} onCheckedChange={(v) => setHasElectricity(!!v)} />
            Electricity available
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amenities">Amenities (comma separated)</Label>
          <Input
            id="amenities"
            className="h-11"
            placeholder="Separate amenities with commas"
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-details">Additional location details</Label>
          <Textarea
            id="loc-details"
            rows={3}
            placeholder="Landmarks that help tenants find the house."
            value={locationDetails}
            onChange={(e) => setLocationDetails(e.target.value)}
          />
        </div>
      </Card>

      <Card className="space-y-4 border-white/70 p-4 shadow-card sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Photos *</h2>
          <p className="text-sm text-muted-foreground">
            Add 1-{MAX_PHOTOS} JPG, PNG or WebP photos. The first photo is the main image; photos
            are compressed automatically.
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
          Choose photos
        </Button>
        {errors["photos"] ? <p className="text-xs text-destructive">{errors["photos"]}</p> : null}

        {existing.length || pending.length ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            {existing.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-secondary"
              >
                <StorageImage
                  image={img}
                  alt="Listing photo"
                  loading="lazy"
                  width={320}
                  height={240}
                  sizes="(max-width: 640px) 50vw, 12rem"
                  responsiveWidths={[160, 240, 320]}
                  className="aspect-[4/3] w-full object-cover"
                />
                {img.is_cover ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-highlight px-1.5 py-0.5 text-[10px] font-semibold text-highlight-foreground">
                    Main
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-1.5 top-1.5 h-7 w-7"
                    onClick={() => void makeCover(img)}
                    aria-label="Set as main photo"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute right-1.5 top-1.5 h-7 w-7"
                  onClick={() => void removeExisting(img)}
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    disabled={saving}
                    onClick={() => void moveExisting(img.id, -1)}
                    aria-label="Move photo left"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    disabled={saving}
                    onClick={() => void moveExisting(img.id, 1)}
                    aria-label="Move photo right"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {pending.map((p) => (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-xl border border-dashed border-primary/50 bg-secondary"
              >
                <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute right-1.5 top-1.5 h-7 w-7"
                  onClick={() => removePending(p.id)}
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    disabled={saving}
                    onClick={() => movePending(p.id, -1)}
                    aria-label="Move photo left"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    disabled={saving}
                    onClick={() => movePending(p.id, 1)}
                    aria-label="Move photo right"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {saving && pending.length ? <Progress value={progress} className="h-2" /> : null}
      </Card>

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Button type="submit" size="lg" className="h-12 w-full sm:w-auto" disabled={saving}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {saving ? "Saving…" : house ? "Save changes" : "Publish house"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12 w-full sm:w-auto"
          onClick={() => navigate({ to: "/landlord/listings" })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
