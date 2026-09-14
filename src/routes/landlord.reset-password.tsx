import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/landlord/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Easy Rent" },
      {
        name: "description",
        content: "Choose a new password for your Easy Rent landlord account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Password updated. You can now manage your listings.");
    navigate({ to: "/landlord/dashboard", replace: true });
  };

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex flex-1 items-center justify-center py-6 sm:py-12">
        <Card className="w-full max-w-md space-y-6 border-white/70 p-4 shadow-card sm:p-8">
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl font-extrabold sm:text-2xl">
              Choose a new password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the new password for your landlord account.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="h-12 pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  className="h-12 pl-10"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={!!error}
                />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>

            <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/landlord/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
