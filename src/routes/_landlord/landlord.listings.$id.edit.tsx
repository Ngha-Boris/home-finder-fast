import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HouseForm } from "@/components/house-form";
import { LandlordShell } from "@/components/landlord-shell";
import { ErrorState } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchHouse } from "@/lib/houses-api";

export const Route = createFileRoute("/_landlord/landlord/listings/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit listing — Nyumba" },
      { name: "description", content: "Update the details, photos and availability of your listing." },
      { property: "og:title", content: "Edit listing — Nyumba" },
      { property: "og:description", content: "Update your rental listing on Nyumba." },
    ],
  }),
  component: EditListingPage,
});

function EditListingPage() {
  const { id } = Route.useParams();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["edit-house", id],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user!.id;
      const [house, profile] = await Promise.all([
        fetchHouse(id),
        supabase.from("profiles").select("phone_number").eq("id", userId).maybeSingle(),
      ]);
      return { userId, house, phone: profile.data?.phone_number ?? "" };
    },
  });

  return (
    <LandlordShell>
      <h1 className="font-display text-3xl font-bold">Edit listing</h1>
      <div className="mt-6">
        {isPending ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : isError || !data?.house ? (
          <ErrorState message="This listing could not be found." onRetry={() => refetch()} />
        ) : (
          <HouseForm userId={data.userId} defaultPhone={data.phone} house={data.house} />
        )}
      </div>
    </LandlordShell>
  );
}
