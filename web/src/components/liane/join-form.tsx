"use client";

import { type FormEvent, useState } from "react";
import { updateMe } from "@/api/auth";
import { joinLiane, updateMembership } from "@/api/lianes";
import type { Liane, Membership, MembershipInput } from "@/api/types";
import { useAppContext } from "@/components/context-provider";
import { Button, Notice } from "@/components/ui";
import { DAYS, distanceLabel, sectionDistance, stopName } from "./labels";

type FormState = {
  fromId: string;
  toId: string;
  alsoBack: boolean;
  weekDays: boolean[];
  canDrive: boolean;
  leaveAt: string;
  backAt: string;
};

const toInputTime = (time: string | null) => (time ? time.slice(0, 5) : "");
const toApiTime = (time: string) => (time ? `${time}:00` : null);

/** Le formulaire parle du trajet du membre ; l'API attend un tronçon dans le sens aller de la liane. */
function initialState(liane: Liane, membership: Membership | null): FormState {
  if (!membership) {
    return {
      fromId: liane.stops[0].id,
      toId: liane.stops[liane.stops.length - 1].id,
      alsoBack: true,
      weekDays: [true, true, true, true, true, false, false],
      canDrive: false,
      leaveAt: "",
      backAt: "",
    };
  }
  const reversed = membership.direction === "Return";
  return {
    fromId: reversed ? membership.alight_stop_id : membership.board_stop_id,
    toId: reversed ? membership.board_stop_id : membership.alight_stop_id,
    alsoBack: membership.direction === "Both",
    weekDays: DAYS.map((_, index) => membership.week_days[index] === "1"),
    canDrive: membership.can_drive,
    leaveAt: toInputTime(
      reversed ? membership.return_time : membership.outbound_time,
    ),
    backAt: toInputTime(
      reversed ? membership.outbound_time : membership.return_time,
    ),
  };
}

function toMembershipInput(liane: Liane, state: FormState): MembershipInput {
  const rank = (id: string) => liane.stops.findIndex((stop) => stop.id === id);
  const followsLine = rank(state.fromId) < rank(state.toId);
  const leaveAt = toApiTime(state.leaveAt);
  const backAt = state.alsoBack ? toApiTime(state.backAt) : null;
  return {
    board_stop_id: followsLine ? state.fromId : state.toId,
    alight_stop_id: followsLine ? state.toId : state.fromId,
    week_days: state.weekDays.map((day) => (day ? "1" : "0")).join(""),
    direction: state.alsoBack ? "Both" : followsLine ? "Outbound" : "Return",
    can_drive: state.canDrive,
    outbound_time: followsLine ? leaveAt : backAt,
    return_time: followsLine ? backAt : leaveAt,
  };
}

const fieldClass =
  "mt-1 block w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base";

export function JoinForm({
  liane,
  membership,
  onDone,
  onCancel,
}: {
  liane: Liane;
  membership: Membership | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user, refreshUser } = useAppContext();
  const [state, setState] = useState(() => initialState(liane, membership));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const needsName = Boolean(user && !user.is_signed_up);
  const distance = sectionDistance(liane, state.fromId, state.toId);
  const set = (change: Partial<FormState>) =>
    setState((current) => ({ ...current, ...change }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state.fromId === state.toId) {
      setError("Choisissez deux arrêts différents.");
      return;
    }
    if (!state.weekDays.some(Boolean)) {
      setError("Choisissez au moins un jour.");
      return;
    }
    if (needsName && (!firstName.trim() || !lastName.trim())) {
      setError("Indiquez votre prénom et votre nom.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (needsName) {
        await updateMe(firstName, lastName);
        await refreshUser();
      }
      const input = toMembershipInput(liane, state);
      if (membership) {
        await updateMembership(liane.id, input);
      } else {
        await joinLiane(liane.id, input);
      }
      onDone();
    } catch {
      setError("L'enregistrement n'a pas fonctionné. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {needsName && (
        <fieldset className="flex flex-col gap-3">
          <label className="text-sm font-medium">
            Votre prénom
            <input
              className={fieldClass}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
            />
          </label>
          <label className="text-sm font-medium">
            Votre nom
            <input
              className={fieldClass}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              Les autres membres voient votre prénom et l'initiale de votre nom.
            </span>
          </label>
        </fieldset>
      )}

      <label className="text-sm font-medium">
        Je monte à
        <select
          className={fieldClass}
          value={state.fromId}
          onChange={(event) => set({ fromId: event.target.value })}
        >
          {liane.stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stopName(stop)}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Je descends à
        <select
          className={fieldClass}
          value={state.toId}
          onChange={(event) => set({ toId: event.target.value })}
        >
          {liane.stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stopName(stop)}
            </option>
          ))}
        </select>
      </label>

      {distance !== null && distance > 0 && (
        <p className="-mt-2 text-sm text-gray-600">
          {liane.route_source === "Osrm"
            ? `Votre trajet : ${distanceLabel(distance)} par la route.`
            : `Votre trajet : environ ${distanceLabel(distance)} à vol d'oiseau.`}
        </p>
      )}

      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={state.alsoBack}
          onChange={(event) => set({ alsoBack: event.target.checked })}
        />
        Je fais aussi le trajet retour
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Mes jours</legend>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {DAYS.map((day, index) => (
            <button
              key={day}
              type="button"
              aria-pressed={state.weekDays[index]}
              onClick={() =>
                set({
                  weekDays: state.weekDays.map((value, position) =>
                    position === index ? !value : value,
                  ),
                })
              }
              className={`min-h-11 rounded-lg border text-sm font-semibold ${
                state.weekDays[index]
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={state.canDrive}
          onChange={(event) => set({ canDrive: event.target.checked })}
        />
        Je peux conduire
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Départ vers (facultatif)
          <input
            type="time"
            className={fieldClass}
            value={state.leaveAt}
            onChange={(event) => set({ leaveAt: event.target.value })}
          />
        </label>
        {state.alsoBack && (
          <label className="text-sm font-medium">
            Retour vers (facultatif)
            <input
              type="time"
              className={fieldClass}
              value={state.backAt}
              onChange={(event) => set({ backAt: event.target.value })}
            />
          </label>
        )}
      </div>

      {error && <Notice>{error}</Notice>}

      <div className="flex gap-3">
        <Button type="submit" disabled={sending} className="flex-1">
          {membership ? "Enregistrer" : "Rejoindre la liane"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
