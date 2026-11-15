"use client";

import { type FormEvent, useState } from "react";
import { Conflict } from "@/api/exception";
import { reportMember } from "@/api/lianes";
import type { Liane, LianeMember } from "@/api/types";
import { Button, Notice } from "@/components/ui";
import { daysLabel, sectionLabel } from "./labels";

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await reportMember(liane.id, member.user.id, reason);
      onClose(true);
    } catch (err) {
      setError(
        err instanceof Conflict
          ? "Vous avez déjà signalé ce membre. Un animateur va regarder."
          : "Le signalement n'a pas été envoyé. Réessayez.",
      );
    }
  };

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <label className="text-sm font-medium">
        Que s'est-il passé ?
        <textarea
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          rows={3}
          maxLength={500}
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <p className="text-xs text-gray-500">
        Votre message est lu par un animateur de Liane, pas par le membre.
      </p>
      {error && <Notice>{error}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!reason.trim()}>
          Envoyer
        </Button>
        <Button variant="secondary" onClick={() => onClose(false)}>
          Annuler
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

  return (
    <ul className="flex flex-col divide-y divide-gray-100">
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
                <span className="block text-sm text-gray-600">
                  {sectionLabel(liane, member)} · {daysLabel(member.week_days)}
                  {member.can_drive && " · peut conduire"}
                </span>
              </div>
              {canReport && !isMe && reportingId !== member.user.id && (
                <Button
                  variant="quiet"
                  className="text-sm font-normal"
                  onClick={() => setReportingId(member.user.id)}
                >
                  Signaler
                </Button>
              )}
            </div>
            {reportedIds.includes(member.user.id) && (
              <p className="mt-1 text-sm text-emerald-700">
                Signalement envoyé. Un animateur va regarder.
              </p>
            )}
            {reportingId === member.user.id && (
              <ReportForm
                liane={liane}
                member={member}
                onClose={(sent) => {
                  setReportingId(null);
                  if (sent) setReportedIds((ids) => [...ids, member.user.id]);
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
