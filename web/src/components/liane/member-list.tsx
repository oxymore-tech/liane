"use client";

import { type FormEvent, useState } from "react";
import { Conflict } from "@/api/exception";
import { reportMember } from "@/api/lianes";
import type { Liane, LianeMember } from "@/api/types";
import { Modal } from "@/components/dialog";
import { PointRoute } from "@/components/rallying-point/point-name";
import {
  Button,
  fieldClass,
  labelClass,
  listClass,
  mutedClass,
  Notice,
} from "@/components/ui";
import { cn } from "@/components/utils";
import { daysLabel, memberSection } from "./labels";

function ReportForm({
  liane,
  member,
  onClose,
}: {
  liane: Liane;
  member: LianeMember;
  onClose: (sent: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await reportMember(liane.id, member.user.id, reason);
      onClose(true);
    } catch (err) {
      setSending(false);
      setError(
        err instanceof Conflict
          ? "Vous avez déjà signalé ce membre. Un animateur va regarder."
          : "Le signalement n'a pas été envoyé. Réessayez.",
      );
    }
  };

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <label className={labelClass}>
        Que s'est-il passé ?
        <textarea
          className={fieldClass}
          rows={3}
          maxLength={500}
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <p className={mutedClass}>
        Votre message est lu par un animateur de Liane, pas par le membre.
      </p>
      {error && <Notice>{error}</Notice>}
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => onClose(false)}>
          Annuler
        </Button>
        <Button type="submit" loading={sending} disabled={!reason.trim()}>
          Envoyer
        </Button>
      </div>
    </form>
  );
}

export function MemberList({
  liane,
  members,
  currentUserId,
  canReport,
}: {
  liane: Liane;
  members: LianeMember[];
  currentUserId: string | undefined;
  canReport: boolean;
}) {
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const reporting = members.find((member) => member.user.id === reportingId);
  const closeReport = (sent: boolean) => {
    if (sent && reportingId) setReportedIds((ids) => [...ids, reportingId]);
    setReportingId(null);
  };

  return (
    <ul className={listClass}>
      {members.map((member) => {
        const isMe = member.user.id === currentUserId;
        return (
          <li key={member.user.id} className="py-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-semibold">
                  {member.user.pseudo ?? "Membre"}
                  {isMe && " (vous)"}
                </span>
                <span className={cn(mutedClass, "block")}>
                  <PointRoute {...memberSection(liane, member)} /> ·{" "}
                  {daysLabel(member.week_days)}
                  {member.can_drive && " · peut conduire"}
                </span>
              </div>
              {canReport && !isMe && (
                <Button
                  variant="quiet"
                  className="min-h-11 shrink-0 text-sm font-normal"
                  onClick={() => setReportingId(member.user.id)}
                >
                  Signaler
                </Button>
              )}
            </div>
            {reportedIds.includes(member.user.id) && (
              <Notice tone="info" className="mt-1">
                Signalement envoyé. Un animateur va regarder.
              </Notice>
            )}
          </li>
        );
      })}
      <Modal
        open={reporting !== undefined}
        onClose={() => closeReport(false)}
        title={`Signaler ${reporting?.user.pseudo ?? "ce membre"}`}
      >
        {reporting && (
          <ReportForm liane={liane} member={reporting} onClose={closeReport} />
        )}
      </Modal>
    </ul>
  );
}
