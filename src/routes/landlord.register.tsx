import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isValidLocalPhone, normalizePhone, phoneToAuthEmail } from "@/lib/phone";

export const Route = createFileRoute("/landlord/register")({
  head: () => ({
    meta: [
      { title: "Register as a landlord — Nyumba" },
      {
        name: "description",
        content: "Create a free landlord account and list your rental houses on Nyumba in minutes.",
      },
      { property: "og:title", content: "Register as a landlord — Nyumba" },
      {
        property: "og:description",
        content: "Create a free landlord account and list your rental houses on Nyumba.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/landlord/dashboard", replace: true });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isValidLocalPhone(phone)) next["phone"] = "Enter a valid 9-digit phone number.";
    if (password.length < 6) next["password"] = "Use at least 6 characters.";
    if (password !== confirm) next["confirm"] = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const normalized = normalizePhone(phone)!;
    setSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: phoneToAuthEmail(normalized),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { phone_number: normalized, display_name: name.trim() || null },
      },
    });

    if (error) {
      setSubmitting(false);
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "That phone number is already registered. Try logging in."
          : error.message,
      );
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        phone_number: normalized,
        display_name: name.trim() || null,
      });
      if (profileError && !profileError.message.includes("duplicate")) {
        toast.error(
          "Account created, but saving your details failed. You can fix this in Profile.",
        );
      }
    }

    setSubmitting(false);
    toast.success("Account created — welcome!");
    navigate({ to: "/landlord/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-md space-y-6 p-6 shadow-card sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Create your landlord account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tenants will call and WhatsApp you on this number.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name (optional)</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  className="h-12 pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  +237
                </span>
                <Input
                  id="phone"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="9-digit phone number"
                  className="h-12 pl-20"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!errors["phone"]}
                />
              </div>
              {errors["phone"] ? (
                <p className="text-xs text-destructive">{errors["phone"]}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="h-12 pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors["password"]}
                />
              </div>
              {errors["password"] ? (
                <p className="text-xs text-destructive">{errors["password"]}</p>
              ) : null}
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
                  aria-invalid={!!errors["confirm"]}
                />
              </div>
              {errors["confirm"] ? (
                <p className="text-xs text-destructive">{errors["confirm"]}</p>
              ) : null}
            </div>

            <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {submitting ? "Creating account…" : "Register"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/landlord/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
