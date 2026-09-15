import { CloudOff, WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";
import { useI18n } from "@/lib/i18n";

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useI18n();
  if (online) return null;
  return (
    <div className="sticky top-16 z-30 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-foreground">
      <WifiOff className="h-4 w-4" />
      {t("offline.banner")}
    </div>
  );
}

export function CachedNotice({ show }: { show: boolean }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <p className="mb-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
      <CloudOff className="h-3.5 w-3.5" />
      {t("offline.cached")}
    </p>
  );
}
