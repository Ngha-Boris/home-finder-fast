import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n();
  const next = language === "en" ? "fr" : "en";

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "default"}
      className={compact ? "h-9 shrink-0 px-2.5" : "shrink-0"}
      onClick={() => setLanguage(next)}
      aria-label={language === "en" ? "Passer en français" : "Switch to English"}
      title={language === "en" ? "Passer en français" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
      <span className="font-semibold uppercase">{next}</span>
    </Button>
  );
}
