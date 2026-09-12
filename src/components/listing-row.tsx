import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StorageImage } from "@/components/storage-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useOnline } from "@/hooks/use-online";
import { deleteHouse, updateHouse } from "@/lib/houses-api";
import { coverImage, formatPrice, houseTypeLabel, type House } from "@/lib/houses-types";

function updateHouseInList(houses: House[] | undefined, next: House) {
  return houses?.map((item) => (item.id === next.id ? next : item));
}

function removeHouseFromList(houses: House[] | undefined, id: string) {
  return houses?.filter((item) => item.id !== id);
}

export function ListingRow({ house, adminMode = false }: { house: House; adminMode?: boolean }) {
  const qc = useQueryClient();
  const online = useOnline();
  const cover = coverImage(house);
  const queryKey = adminMode ? ["admin-houses"] : ["my-houses"];

  const toggle = useMutation({
    mutationFn: (available: boolean) =>
      updateHouse(house.id, { availability: available ? "available" : "unavailable" }),
    onMutate: async (available) => {
      await qc.cancelQueries({ queryKey });
      await qc.cancelQueries({ queryKey: ["houses", "feed"] });
      await qc.cancelQueries({ queryKey: ["houses", "detail", house.id] });

      const previousList = qc.getQueryData<House[]>(queryKey);
      const previousFeed = qc.getQueryData<House[]>(["houses", "feed"]);
      const previousDetail = qc.getQueryData<House | null>(["houses", "detail", house.id]);
      const nextHouse = {
        ...house,
        availability: available ? "available" : "unavailable",
      } satisfies House;

      qc.setQueryData<House[]>(queryKey, (current) => updateHouseInList(current, nextHouse));
      qc.setQueryData<House | null>(["houses", "detail", house.id], (current) =>
        current ? nextHouse : current,
      );
      qc.setQueryData<House[]>(["houses", "feed"], (current) =>
        available ? updateHouseInList(current, nextHouse) : removeHouseFromList(current, house.id),
      );

      return { previousList, previousFeed, previousDetail };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["houses"] });
      toast.success("Availability updated");
    },
    onError: (e: Error, _available, context) => {
      qc.setQueryData(queryKey, context?.previousList);
      qc.setQueryData(["houses", "feed"], context?.previousFeed);
      qc.setQueryData(["houses", "detail", house.id], context?.previousDetail);
      toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteHouse(house),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      await qc.cancelQueries({ queryKey: ["houses", "feed"] });

      const previousList = qc.getQueryData<House[]>(queryKey);
      const previousFeed = qc.getQueryData<House[]>(["houses", "feed"]);

      qc.setQueryData<House[]>(queryKey, (current) => removeHouseFromList(current, house.id));
      qc.setQueryData<House[]>(["houses", "feed"], (current) =>
        removeHouseFromList(current, house.id),
      );

      return { previousList, previousFeed };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["houses"] });
      toast.success("Listing deleted");
    },
    onError: (e: Error, _variables, context) => {
      qc.setQueryData(queryKey, context?.previousList);
      qc.setQueryData(["houses", "feed"], context?.previousFeed);
      toast.error(e.message);
    },
  });

  const guard = (fn: () => void) => () => {
    if (!online) {
      toast.error("This action requires an internet connection.");
      return;
    }
    fn();
  };

  return (
    <Card className="flex flex-col gap-4 p-4 shadow-card sm:flex-row sm:items-center">
      <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-36">
        {cover ? (
          <StorageImage
            image={cover}
            alt={`${houseTypeLabel(house.house_type)} in ${house.location}`}
            loading="lazy"
            width={288}
            height={192}
            sizes="(max-width: 640px) 100vw, 9rem"
            responsiveWidths={[192, 288, 384]}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
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
        <p className="mt-1 font-display text-lg font-bold text-primary">
          {formatPrice(house.rent_price)}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {house.location} · {house.region}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="mr-2 flex items-center gap-2 text-sm">
          <Switch
            checked={house.availability === "available"}
            disabled={toggle.isPending}
            onCheckedChange={(v) => guard(() => toggle.mutate(v))()}
            aria-label="Toggle availability"
          />
          <span className="hidden sm:inline">Available</span>
        </label>

        <Button asChild variant="outline" size="sm">
          <Link to="/houses/$id" params={{ id: house.id }}>
            <Eye className="h-4 w-4" />
            View
          </Link>
        </Button>

        {!adminMode ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/landlord/listings/$id/edit" params={{ id: house.id }}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={remove.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this listing?</AlertDialogTitle>
              <AlertDialogDescription>
                The listing and all of its photos will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={guard(() => remove.mutate())}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
