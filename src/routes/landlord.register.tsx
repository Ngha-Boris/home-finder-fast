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
import { useI18n } from "@/lib/i18n";
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

function clearAuthDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LANDLORD_AUTH_DRAFT_KEY);
}

export const Route = createFileRoute("/landlord/register")({
  head: () => ({
    meta: [
      { title: "Register as a landlord — Easy Rent" },
      {
        name: "description",
        content:
          "Create a free landlord account and list your rental houses on Easy Rent in minutes.",
      },
      { property: "og:title", content: "Register as a landlord — Easy Rent" },
      {
        property: "og:description",
        content: "Create a free landlord account and list your rental houses on Easy Rent.",
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
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/landlord/dashboard", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const draft = readAuthDraft();
    if (!draft) return;
    setPhone((current) => current || draft.phone || "");
    setPassword((current) => current || draft.password || "");
    setConfirm((current) => current || draft.password || "");
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isValidLocalPhone(phone)) next["phone"] = t("auth.validation.validPhone");
    if (password.length < 6) next["password"] = t("auth.validation.shortPassword");
    if (password !== confirm) next["confirm"] = t("auth.validation.passwordMismatch");
    setErrors(next);
    if (Object.keys(next).length) return;

    const normalized = normalizePhone(phone)!;
    setSubmitting(true);

    const response = await fetch("/api/landlord/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, phone: normalized, password }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setSubmitting(false);
      toast.error(result.error ?? t("auth.createFailed"));
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      phone: `+${normalized}`,
      password,
    });

    setSubmitting(false);
    clearAuthDraft();
    if (error) {
      toast.success(t("auth.createdLogin"));
      navigate({ to: "/landlord/login" });
      return;
    }

    toast.success(t("auth.createdWelcome"));
    navigate({ to: "/landlord/dashboard" });
  };

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex flex-1 items-center justify-center py-6 sm:py-12">
        <Card className="w-full max-w-md space-y-5 border-white/70 p-4 shadow-card sm:space-y-6 sm:p-8">
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Phone className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl font-extrabold sm:text-2xl">
              {t("auth.registerTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("auth.nameOptional")}</Label>
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
              <Label htmlFor="phone">{t("auth.phone")}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  +237
                </span>
                <Input
                  id="phone"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder={t("auth.phonePlaceholder")}
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
              <Label htmlFor="password">{t("auth.password")}</Label>
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
              <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
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
              {submitting ? t("auth.creating") : t("auth.register")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.alreadyRegistered")}{" "}
            <Link
              to="/landlord/login"
              className="font-medium text-primary hover:underline"
              onClick={() => saveAuthDraft(phone, password)}
            >
              {t("auth.logIn")}
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
