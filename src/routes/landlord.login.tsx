import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Phone } from "lucide-react";
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

export const Route = createFileRoute("/landlord/login")({
  head: () => ({
    meta: [
      { title: "Landlord login — Nyumba" },
      { name: "description", content: "Sign in to manage your rental listings on Nyumba." },
      { property: "og:title", content: "Landlord login — Nyumba" },
      { property: "og:description", content: "Sign in to manage your rental listings on Nyumba." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/landlord/dashboard", replace: true });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isValidLocalPhone(phone)) next.phone = "Enter your 9-digit phone number.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToAuthEmail(normalizePhone(phone)!),
      password,
    });
    setSubmitting(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "Wrong phone number or password."
          : error.message,
      );
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/landlord/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-md space-y-6 p-6 shadow-card sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Landlord login</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with the phone number you registered with.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
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
                  placeholder="677123456"
                  className="h-12 pl-20"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!errors.phone}
                />
              </div>
              {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-12 pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                />
              </div>
              {errors.password ? <p className="text-xs text-destructive">{errors.password}</p> : null}
            </div>

            <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {submitting ? "Signing in…" : "Login"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/landlord/register" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
