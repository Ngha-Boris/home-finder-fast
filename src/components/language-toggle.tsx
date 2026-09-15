import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { language, setLanguage } = useI18n();
  const next = language === "en" ? "fr" : "en";

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "default"}
      className={cn(
        "shrink-0 rounded-full",
        compact ? "h-8 gap-1.5 px-2 text-xs min-[375px]:h-9 min-[375px]:px-2.5" : "",
        className,
      )}
      onClick={() => setLanguage(next)}
      aria-label={language === "en" ? "Passer en français" : "Switch to English"}
      title={language === "en" ? "Passer en français" : "Switch to English"}
    >
      <Languages className="h-3.5 w-3.5 min-[375px]:h-4 min-[375px]:w-4" />
      <span className="font-semibold uppercase">{next}</span>
    </Button>
  );
}
