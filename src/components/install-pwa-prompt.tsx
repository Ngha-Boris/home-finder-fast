import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const INSTALL_PROMPT_SEEN_KEY = "easy-rent:pwa-install-prompt-seen";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasPromptSeen() {
  try {
    return window.localStorage.getItem(INSTALL_PROMPT_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function markPromptSeen() {
  try {
    window.localStorage.setItem(INSTALL_PROMPT_SEEN_KEY, "true");
  } catch {
    // Ignore storage failures; the prompt can safely reappear next visit.
  }
}

export function InstallPwaPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (isStandalone() || wasPromptSeen()) return;

    if (isIosDevice()) {
      setShowIosHelp(true);
      setOpen(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setOpen(true);
    };

    const onInstalled = () => {
      markPromptSeen();
      setOpen(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!open || (!installEvent && !showIosHelp)) return null;

  const dismiss = () => {
    markPromptSeen();
    setOpen(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    markPromptSeen();
    setOpen(false);
    setInstallEvent(null);
  };

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 mx-auto max-h-[calc(100dvh-1rem)] max-w-md overflow-y-auto rounded-2xl border border-white/70 bg-card/95 p-3 text-card-foreground shadow-card backdrop-blur-xl sm:inset-x-3 sm:bottom-5">
      <div className="flex gap-2 min-[360px]:gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground min-[360px]:h-11 min-[360px]:w-11">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-extrabold">{t("pwa.installTitle")}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {showIosHelp ? t("pwa.iosText") : t("pwa.installText")}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={dismiss}
              aria-label={t("pwa.notNow")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {showIosHelp ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("pwa.iosText")}</p>
          ) : null}

          <div className="mt-3 grid gap-2 min-[360px]:flex">
            {installEvent ? (
              <Button type="button" size="sm" className="h-9 flex-1" onClick={() => void install()}>
                <Download className="h-4 w-4" />
                {t("pwa.install")}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={installEvent ? "outline" : "default"}
              className="h-9 flex-1"
              onClick={dismiss}
            >
              {installEvent ? t("pwa.notNow") : t("pwa.gotIt")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
