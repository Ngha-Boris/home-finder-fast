import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LandlordShell } from "@/components/landlord-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay } from "@/lib/phone";

export const Route = createFileRoute("/_landlord/landlord/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Nyumba" },
      { name: "description", content: "Update the name tenants see next to your listings." },
      { property: "og:title", content: "My profile — Nyumba" },
      { property: "og:description", content: "Manage your landlord profile on Nyumba." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user!.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, phone_number")
        .eq("id", userId)
        .maybeSingle();
      return profile;
    },
  });

  useEffect(() => {
    if (data?.display_name) setFullName(data.display_name);
  }, [data?.display_name]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: fullName.trim() })
        .eq("id", data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <LandlordShell>
      <h1 className="font-display text-3xl font-bold">My profile</h1>
      <Card className="mt-6 max-w-lg space-y-5 p-5 shadow-card sm:p-6">
        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                className="h-11"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              <Input className="h-11" value={formatPhoneDisplay(data?.phone_number ?? "")} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                Your phone number is your login and can't be changed here.
              </p>
            </div>
            <Button
              className="h-11"
              disabled={save.isPending || fullName.trim().length < 2}
              onClick={() => save.mutate()}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </>
        )}
      </Card>
    </LandlordShell>
  );
}
