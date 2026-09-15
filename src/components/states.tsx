import { AlertTriangle, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-warning" />
      <div>
        <h3 className="font-display text-lg font-semibold">{t("state.errorTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message ?? t("state.errorMessage")}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {t("state.retry")}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground" />
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
