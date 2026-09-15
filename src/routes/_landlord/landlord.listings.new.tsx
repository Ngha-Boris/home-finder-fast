import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HouseForm } from "@/components/house-form";
import { LandlordShell } from "@/components/landlord-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { phoneFromAuthIdentity, phoneInputValue } from "@/lib/phone";

export const Route = createFileRoute("/_landlord/landlord/listings/new")({
  head: () => ({
    meta: [
      { title: "Add a house — Easy Rent" },
      {
        name: "description",
        content: "List a new rental house with photos, rent and contact details.",
      },
      { property: "og:title", content: "Add a house — Easy Rent" },
      { property: "og:description", content: "List a new rental house on Easy Rent." },
    ],
  }),
  component: NewListingPage,
});

function NewListingPage() {
  const { t } = useI18n();
  const { data, isPending } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user!;
      const userId = user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, display_name")
        .eq("id", userId)
        .maybeSingle();
      return {
        userId,
        phone: phoneInputValue(profile?.phone_number) || phoneFromAuthIdentity(user),
      };
    },
  });

  return (
    <LandlordShell>
      <h1 className="font-display text-3xl font-bold">{t("landlord.addTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("landlord.requiredHint")}</p>
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
