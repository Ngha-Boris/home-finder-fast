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
import { isValidLocalPhone, normalizePhone } from "@/lib/phone";

const LANDLORD_AUTH_DRAFT_KEY = "easy-rent:landlord-auth-draft";

function readAuthDraft() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(LANDLORD_AUTH_DRAFT_KEY) ?? "null") as {
      phone?: string;
      password?: string;
    } | null;
  } catch {
    return null;
  }
}

function saveAuthDraft(phone: string, password: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LANDLORD_AUTH_DRAFT_KEY, JSON.stringify({ phone, password }));
}

export const Route = createFileRoute("/landlord/login")({
  head: () => ({
    meta: [
      { title: "Landlord login — Easy Rent" },
      { name: "description", content: "Sign in to manage your rental listings on Easy Rent." },
      { property: "og:title", content: "Landlord login — Easy Rent" },
      {
        property: "og:description",
        content: "Sign in to manage your rental listings on Easy Rent.",
      },
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

  useEffect(() => {
    const draft = readAuthDraft();
    if (!draft) return;
    setPhone((current) => current || draft.phone || "");
    setPassword((current) => current || draft.password || "");
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isValidLocalPhone(phone)) next.phone = "Enter your 9-digit phone number.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      phone: `+${normalizePhone(phone)!}`,
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
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex flex-1 items-center justify-center pb-24 pt-6 sm:py-12">
        <Card className="w-full max-w-md space-y-5 border-white/70 p-4 shadow-card sm:space-y-6 sm:p-8">
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Phone className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl font-extrabold sm:text-2xl">Landlord login</h1>
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
                  placeholder="9-digit phone number"
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
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password}</p>
              ) : null}
            </div>

            <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {submitting ? "Signing in…" : "Login"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/landlord/register"
              className="font-medium text-primary hover:underline"
              onClick={() => saveAuthDraft(phone, password)}
            >
              Register
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
