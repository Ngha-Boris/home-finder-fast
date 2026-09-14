import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HouseForm } from "@/components/house-form";
import { LandlordShell } from "@/components/landlord-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_landlord/landlord/listings/new")({
  head: () => ({
    meta: [
      { title: "Add a house — Nyumba" },
      {
        name: "description",
        content: "List a new rental house with photos, rent and contact details.",
      },
      { property: "og:title", content: "Add a house — Nyumba" },
      { property: "og:description", content: "List a new rental house on Nyumba." },
    ],
  }),
  component: NewListingPage,
});

function NewListingPage() {
  const { data, isPending } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user!.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, display_name")
        .eq("id", userId)
        .maybeSingle();
      return { userId, phone: profile?.phone_number ?? "" };
    },
  });

  return (
    <LandlordShell>
      <h1 className="font-display text-3xl font-bold">Add a house</h1>
      <p className="mt-1 text-sm text-muted-foreground">Fields marked with * are required.</p>
      <div className="mt-6">
        {isPending || !data ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <HouseForm userId={data.userId} defaultPhone={data.phone} />
        )}
      </div>
    </LandlordShell>
  );
}
