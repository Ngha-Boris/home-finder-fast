import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, EyeOff, Flag, RefreshCw, Users } from "lucide-react";
import { useState } from "react";
import { LandlordShell } from "@/components/landlord-shell";
import { ListingRow } from "@/components/listing-row";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchAllHousesAdmin,
  fetchLandlordsAdmin,
  fetchListingReportsAdmin,
  updateListingReportStatus,
  type ListingReport,
} from "@/lib/houses-api";
import { useI18n } from "@/lib/i18n";
import { formatPhoneDisplay } from "@/lib/phone";

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Easy Rent" },
      { name: "description", content: "Review landlords and every listing on the platform." },
      { property: "og:title", content: "Admin — Easy Rent" },
      { property: "og:description", content: "Platform administration for Easy Rent." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [reportStatus, setReportStatus] = useState<"open" | "reviewed" | "dismissed">("open");
  const houses = useQuery({ queryKey: ["admin-houses"], queryFn: fetchAllHousesAdmin });
  const landlords = useQuery({ queryKey: ["admin-landlords"], queryFn: fetchLandlordsAdmin });
  const reports = useQuery({
    queryKey: ["admin-listing-reports", reportStatus],
    queryFn: () => fetchListingReportsAdmin(reportStatus),
  });
  const allHouses = houses.data ?? [];
  const available = allHouses.filter((house) => house.availability === "available").length;
  const unavailable = allHouses.length - available;
  const refreshing = houses.isFetching || landlords.isFetching || reports.isFetching;
  const openReports = reports.data?.filter((report) => report.status === "open").length ?? 0;
  const reportStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "reviewed" | "dismissed" }) =>
      updateListingReportStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-listing-reports"] }),
  });

  const refresh = () => {
    void houses.refetch();
    void landlords.refetch();
    void reports.refetch();
  };

  return (
    <LandlordShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("admin.refresh")}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          icon={Building2}
          label={t("nav.listings")}
          value={houses.isPending ? null : allHouses.length}
        />
        <AdminStat
          icon={CheckCircle2}
          label={t("common.available")}
          value={houses.isPending ? null : available}
        />
        <AdminStat
          icon={EyeOff}
          label={t("common.unavailable")}
          value={houses.isPending ? null : unavailable}
        />
        <AdminStat
          icon={Users}
          label={t("nav.landlords")}
          value={landlords.isPending ? null : (landlords.data?.length ?? 0)}
        />
        <AdminStat
          icon={Flag}
          label={t("admin.openReports")}
          value={reports.isPending ? null : openReports}
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{t("admin.reportSection")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.reportSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["open", "reviewed", "dismissed"] as const).map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={reportStatus === status ? "default" : "secondary"}
              onClick={() => setReportStatus(status)}
            >
              {status === "open"
                ? t("admin.open")
                : status === "reviewed"
                  ? t("admin.reviewed")
                  : t("admin.dismissed")}
            </Button>
          ))}
        </div>
      </div>
      <Card className="mt-4 overflow-x-auto shadow-card">
        {reports.isPending ? (
          <Skeleton className="m-4 h-32" />
        ) : reports.isError ? (
          <ErrorState onRetry={() => reports.refetch()} />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState
            title={t("admin.noReports", {
              status:
                reportStatus === "open"
                  ? t("admin.open").toLowerCase()
                  : reportStatus === "reviewed"
                    ? t("admin.reviewed").toLowerCase()
                    : t("admin.dismissed").toLowerCase(),
            })}
            description={t("admin.reportsEmpty")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.listing")}</TableHead>
                <TableHead>{t("admin.reason")}</TableHead>
                <TableHead>{t("detail.details")}</TableHead>
                <TableHead>{t("admin.status")}</TableHead>
                <TableHead className="text-right">{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reports.data ?? []).map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  pending={reportStatusMutation.isPending}
                  onStatus={(status) => reportStatusMutation.mutate({ id: report.id, status })}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <h2 className="mt-10 font-display text-xl font-bold">{t("admin.landlordsTitle")}</h2>
      <Card className="mt-4 overflow-x-auto shadow-card">
        {landlords.isPending ? (
          <Skeleton className="m-4 h-32" />
        ) : landlords.isError ? (
          <ErrorState onRetry={() => landlords.refetch()} />
        ) : (landlords.data ?? []).length === 0 ? (
          <EmptyState
            title={t("admin.noLandlords")}
            description={t("admin.noLandlordsDescription")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.name")}</TableHead>
                <TableHead>{t("admin.phone")}</TableHead>
                <TableHead className="text-right">{t("nav.listings")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(landlords.data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.display_name ?? "—"}</TableCell>
                  <TableCell>{l.phone_number ? formatPhoneDisplay(l.phone_number) : "—"}</TableCell>
                  <TableCell className="text-right">{l.listing_count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <h2 className="mt-10 font-display text-xl font-bold">{t("admin.allListings")}</h2>
      <div className="mt-4 space-y-3">
        {houses.isPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : houses.isError ? (
          <ErrorState onRetry={() => houses.refetch()} />
        ) : allHouses.length === 0 ? (
          <EmptyState
            title={t("admin.noListings")}
            description={t("admin.noListingsDescription")}
          />
        ) : (
          allHouses.map((house) => <ListingRow key={house.id} house={house} adminMode />)
        )}
      </div>
    </LandlordShell>
  );
}

function ReportRow({
  report,
  pending,
  onStatus,
}: {
  report: ListingReport;
  pending: boolean;
  onStatus: (status: "open" | "reviewed" | "dismissed") => void;
}) {
  const house = report.houses;
  const { t, houseType, formatDate } = useI18n();
  return (
    <TableRow>
      <TableCell className="min-w-52">
        {house ? (
          <div>
            <p className="font-medium">
              {t("listing.title", { type: houseType(house.house_type), location: house.location })}
            </p>
            <p className="text-xs text-muted-foreground">
              {house.region} -{" "}
              {house.availability === "available" ? t("common.available") : t("common.unavailable")}{" "}
              - {formatDate(report.created_at)}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">{t("admin.deletedListing")}</span>
        )}
      </TableCell>
      <TableCell className="min-w-36 capitalize">{report.reason.replaceAll("_", " ")}</TableCell>
      <TableCell className="max-w-sm">
        <p className="line-clamp-3 break-words text-sm text-muted-foreground">
          {report.details || t("admin.noDetails")}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
          {report.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {report.status !== "reviewed" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => onStatus("reviewed")}
            >
              {t("admin.reviewed")}
            </Button>
          ) : null}
          {report.status !== "dismissed" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => onStatus("dismissed")}
            >
              {t("admin.dismiss")}
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function AdminStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number | null;
}) {
  return (
    <Card className="flex items-center gap-4 p-5 shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-7 w-12" />
        ) : (
          <p className="font-display text-2xl font-bold">{value}</p>
        )}
      </div>
    </Card>
  );
}
