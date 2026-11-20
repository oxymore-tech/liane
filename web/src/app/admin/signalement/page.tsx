"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { dismissReport, excludeReported, listReports } from "@/api/lianes";
import type { Report } from "@/api/types";
import { ConfirmDialog } from "@/components/dialog";
import { Button, Card, linkClass, mutedClass } from "@/components/ui";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function AdminReportsPage() {
  const { data: reports, refetch } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: listReports,
  });

  const [toExclude, setToExclude] = useState<Report | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const exclude = async (report: Report) => {
    await excludeReported(report.id);
    await refetch();
    setToExclude(null);
  };

  const dismiss = async (report: Report) => {
    setDismissingId(report.id);
    await dismissReport(report.id);
    await refetch();
    setDismissingId(null);
  };

  return (
    <>
      {reports?.length === 0 && <Card>Aucun signalement à traiter.</Card>}
      {reports?.map((report) => (
        <Card key={report.id} className="flex flex-col gap-2">
          <p>
            <span className="font-bold">
              {report.reported.pseudo ?? "Membre sans nom"}
            </span>{" "}
            est signalé dans{" "}
            <Link href={`/l/${report.liane.slug}`} className={linkClass}>
              {report.liane.name}
            </Link>
          </p>
          <blockquote className="rounded-field bg-pierre px-3 py-2 text-encre">
            {report.reason}
          </blockquote>
          <p className={mutedClass}>
            Par {report.reporter.pseudo ?? "un membre sans nom"}, le{" "}
            {formatDate(report.created_at)}
            {!report.reported_is_member && " · a déjà quitté la liane"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setToExclude(report)}>
              Exclure de la liane
            </Button>
            <Button
              variant="secondary"
              loading={dismissingId === report.id}
              onClick={() => dismiss(report)}
            >
              Classer
            </Button>
          </div>
        </Card>
      ))}
      <ConfirmDialog
        open={toExclude !== null}
        onClose={() => setToExclude(null)}
        onConfirm={() => (toExclude ? exclude(toExclude) : undefined)}
        title={`Exclure ${toExclude?.reported.pseudo ?? "ce membre"} de « ${toExclude?.liane.name} » ?`}
        confirmLabel="Exclure de la liane"
        destructive
      >
        <p>
          Ce membre quitte la liane et ses inscriptions aux trajets à venir.
        </p>
      </ConfirmDialog>
    </>
  );
}
