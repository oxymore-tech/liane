"use client";

import { type FormEvent, useId, useState } from "react";
import { updateMe } from "@/api/auth";
import { joinLiane, updateMembership } from "@/api/lianes";
import type { Liane, Membership, MembershipInput } from "@/api/types";
import { useAppContext } from "@/components/context-provider";
import { PointName } from "@/components/rallying-point/point-name";
import { SelectField } from "@/components/select-field";
import {
  Button,
  checkboxClass,
  FieldError,
  fieldClass,
  labelClass,
  mutedClass,
  Notice,
  toggleClass,
} from "@/components/ui";
import { DAYS, distanceLabel, sectionDistance } from "./labels";

type FormState = {
  fromId: string;
  toId: string;
  alsoBack: boolean;
  weekDays: boolean[];
  canDrive: boolean;
  leaveAt: string;
  backAt: string;
};

/** `field` désigne le champ fautif ; sans lui, l'erreur concerne tout le formulaire. */
type FormError = { field?: "name" | "stops" | "days"; message: string };

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
  const [error, setError] = useState<FormError | null>(null);
  const [sending, setSending] = useState(false);
  const errorId = useId();
  const errorOf = (field: FormError["field"]) =>
    error && error.field === field ? error.message : null;

  const needsName = Boolean(user && !user.is_signed_up);
  const distance = sectionDistance(liane, state.fromId, state.toId);
  const set = (change: Partial<FormState>) =>
    setState((current) => ({ ...current, ...change }));
  const stopOptions = liane.stops.map((stop) => ({
    value: stop.id,
    content: <PointName point={stop} />,
  }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state.fromId === state.toId) {
      setError({
        field: "stops",
        message: "Choisissez deux arrêts différents.",
      });
      return;
    }
    if (!state.weekDays.some(Boolean)) {
      setError({ field: "days", message: "Choisissez au moins un jour." });
      return;
    }
    if (needsName && (!firstName.trim() || !lastName.trim())) {
      setError({
        field: "name",
        message: "Indiquez votre prénom et votre nom.",
      });
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
      setError({ message: "L'enregistrement n'a pas fonctionné. Réessayez." });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {needsName && (
        <fieldset className="flex flex-col gap-3">
          <label className={labelClass}>
            Votre prénom
            <input
              className={fieldClass}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              aria-invalid={
                errorOf("name") && !firstName.trim() ? true : undefined
              }
              aria-describedby={errorOf("name") ? errorId : undefined}
            />
          </label>
          <label className={labelClass}>
            Votre nom
            <input
              className={fieldClass}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              aria-invalid={
                errorOf("name") && !lastName.trim() ? true : undefined
              }
              aria-describedby={errorOf("name") ? errorId : undefined}
            />
            <span className="mt-1 block text-sm font-normal text-gris">
              Les autres membres voient votre prénom et l'initiale de votre nom.
            </span>
          </label>
          {errorOf("name") && (
            <FieldError id={errorId}>{errorOf("name")}</FieldError>
          )}
        </fieldset>
      )}

      <SelectField
        label="Je monte à"
        value={state.fromId}
        options={stopOptions}
        onChange={(fromId) => set({ fromId })}
      />

      <SelectField
        label="Je descends à"
        value={state.toId}
        options={stopOptions}
        onChange={(toId) => set({ toId })}
        error={errorOf("stops")}
      />

      {distance !== null && distance > 0 && (
        <p className={`${mutedClass} -mt-2`}>
          {liane.route_source === "Osrm"
            ? `Votre trajet : ${distanceLabel(distance)} par la route.`
            : `Votre trajet : environ ${distanceLabel(distance)} à vol d'oiseau.`}
        </p>
      )}

      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={state.alsoBack}
          onChange={(event) => set({ alsoBack: event.target.checked })}
        />
        Je fais aussi le trajet retour
      </label>

      <fieldset aria-describedby={errorOf("days") ? errorId : undefined}>
        <legend className={labelClass}>Mes jours</legend>
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
              className={toggleClass(state.weekDays[index])}
            >
              {day}
            </button>
          ))}
        </div>
        {errorOf("days") && (
          <FieldError id={errorId}>{errorOf("days")}</FieldError>
        )}
      </fieldset>

      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={state.canDrive}
          onChange={(event) => set({ canDrive: event.target.checked })}
        />
        Je peux conduire
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Départ vers (facultatif)
          <input
            type="time"
            className={fieldClass}
            value={state.leaveAt}
            onChange={(event) => set({ leaveAt: event.target.value })}
          />
        </label>
        {state.alsoBack && (
          <label className={labelClass}>
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

      {error && !error.field && <Notice>{error.message}</Notice>}

      <div className="flex gap-3">
        <Button type="submit" loading={sending} className="flex-1">
          {membership ? "Enregistrer" : "Rejoindre la liane"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
