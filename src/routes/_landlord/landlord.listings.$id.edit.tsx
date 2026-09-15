import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HouseForm } from "@/components/house-form";
import { LandlordShell } from "@/components/landlord-shell";
import { ErrorState } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyHouse } from "@/lib/houses-api";
import { useI18n } from "@/lib/i18n";
import { phoneFromAuthIdentity, phoneInputValue } from "@/lib/phone";

export const Route = createFileRoute("/_landlord/landlord/listings/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit listing — Easy Rent" },
      {
        name: "description",
        content: "Update the details, photos and availability of your listing.",
      },
      { property: "og:title", content: "Edit listing — Easy Rent" },
      { property: "og:description", content: "Update your rental listing on Easy Rent." },
    ],
  }),
  component: EditListingPage,
});

function EditListingPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["edit-house", id],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user!;
      const userId = user.id;
      const [house, profile] = await Promise.all([
        fetchMyHouse(id),
        supabase.from("profiles").select("phone_number").eq("id", userId).maybeSingle(),
      ]);
      return {
        userId,
        house,
        phone: phoneInputValue(profile.data?.phone_number) || phoneFromAuthIdentity(user),
      };
    },
  });

  return (
    <LandlordShell>
      <h1 className="font-display text-3xl font-bold">{t("landlord.editTitle")}</h1>
      <div className="mt-6">
        {isPending ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : isError || !data?.house ? (
          <ErrorState message={t("landlord.notFound")} onRetry={() => refetch()} />
        ) : (
          <HouseForm userId={data.userId} defaultPhone={data.phone} house={data.house} />
        )}
      </div>
    </LandlordShell>
  );
}
