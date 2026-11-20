"use client";

import { Field, Label, Radio, RadioGroup } from "@headlessui/react";
import { type FormEvent, useId, useState } from "react";
import { createTrip } from "@/api/trips";
import type { Liane, Membership, TripDetail, TripDirection } from "@/api/types";
import {
  distanceLabel,
  firstStopName,
  lastStopName,
  sectionDistance,
  stopName,
} from "@/components/liane/labels";
import { SelectField } from "@/components/select-field";
import {
  Button,
  FieldError,
  fieldClass,
  labelClass,
  mutedClass,
  Notice,
  toggleClass,
} from "@/components/ui";
import { cn } from "@/components/utils";

const SEAT_CHOICES = [1, 2, 3, 4, 5, 6];
const DEFAULT_SEATS = 3;
const DEFAULT_TIME = "07:30";

/** `field` désigne le champ fautif ; sans lui, l'erreur concerne tout le formulaire. */
type FormError = { field?: "time" | "section"; message: string };

const pad = (value: number) => String(value).padStart(2, "0");

const localDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDate(date);
};

const stopOption = (stop: { id: string; city: string; label: string }) => ({
  value: stop.id,
  content: stopName(stop),
});

/** Le tronçon habituel du membre, pris dans le sens du trajet. */
const usualSection = (membership: Membership, direction: TripDirection) =>
  direction === "Outbound"
    ? { fromId: membership.board_stop_id, toId: membership.alight_stop_id }
    : { fromId: membership.alight_stop_id, toId: membership.board_stop_id };

export function TripForm({
  liane,
  membership,
  onDone,
  onCancel,
}: {
  liane: Liane;
  membership: Membership;
  onDone: (trip: TripDetail) => void;
  onCancel: () => void;
}) {
  const initialDirection: TripDirection =
    membership.direction === "Return" ? "Return" : "Outbound";
  const [direction, setDirection] = useState(initialDirection);
  const [section, setSection] = useState(
    usualSection(membership, initialDirection),
  );
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState(
    (initialDirection === "Return"
      ? membership.return_time
      : membership.outbound_time
    )?.slice(0, 5) ?? DEFAULT_TIME,
  );
  const [seats, setSeats] = useState(DEFAULT_SEATS);
  const [error, setError] = useState<FormError | null>(null);
  const [sending, setSending] = useState(false);
  const errorId = useId();
  const timeError = error?.field === "time" ? error.message : null;

  const stops =
    direction === "Outbound" ? liane.stops : [...liane.stops].reverse();
  const indexOf = (id: string) => stops.findIndex((stop) => stop.id === id);
  const distance = sectionDistance(liane, section.fromId, section.toId);

  const changeDirection = (next: TripDirection) => {
    setDirection(next);
    setSection(usualSection(membership, next));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const departure = new Date(`${date}T${time}`);
    if (Number.isNaN(departure.getTime())) {
      setError({
        field: "time",
        message: "Indiquez le jour et l'heure du départ.",
      });
      return;
    }
    if (departure.getTime() < Date.now()) {
      setError({ field: "time", message: "Cette heure est déjà passée." });
      return;
    }
    if (indexOf(section.fromId) >= indexOf(section.toId)) {
      setError({
        field: "section",
        message:
          "L'arrivée doit se trouver après le départ, dans le sens choisi.",
      });
      return;
    }
    setSending(true);
    setError(null);
    try {
      const trip = await createTrip(liane.id, {
        departure_time: departure.toISOString(),
        direction,
        seat_count: seats,
        from_stop_id: section.fromId,
        to_stop_id: section.toId,
      });
      onDone(trip);
    } catch {
      setError({
        message:
          "Le trajet n'a pas été enregistré. Vérifiez le jour et l'heure.",
      });
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field>
        <Label className={labelClass}>Dans quel sens ?</Label>
        <RadioGroup
          value={direction}
          onChange={changeDirection}
          className="mt-1 grid grid-cols-1 gap-2"
        >
          {(["Outbound", "Return"] as const).map((choice) => (
            <Radio
              key={choice}
              value={choice}
              className={cn(
                toggleClass(direction === choice),
                "flex items-center px-3 py-2 text-left text-base",
              )}
            >
              {choice === "Outbound"
                ? `${firstStopName(liane)} → ${lastStopName(liane)}`
                : `${lastStopName(liane)} → ${firstStopName(liane)}`}
            </Radio>
          ))}
        </RadioGroup>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Jour
          <input
            type="date"
            className={fieldClass}
            required
            min={localDate(new Date())}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={timeError ? true : undefined}
            aria-describedby={timeError ? errorId : undefined}
          />
        </label>
        <label className={labelClass}>
          Heure de départ
          <input
            type="time"
            className={fieldClass}
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-invalid={timeError ? true : undefined}
            aria-describedby={timeError ? errorId : undefined}
          />
        </label>
        {timeError && (
          <div className="col-span-2 -mt-2">
            <FieldError id={errorId}>{timeError}</FieldError>
          </div>
        )}
      </div>

      <SelectField
        label="Je pars de"
        value={section.fromId}
        options={stops.slice(0, -1).map(stopOption)}
        onChange={(fromId) => setSection({ ...section, fromId })}
      />

      <SelectField
        label="Je vais jusqu'à"
        value={section.toId}
        options={stops.slice(1).map(stopOption)}
        onChange={(toId) => setSection({ ...section, toId })}
        error={error?.field === "section" ? error.message : null}
      />

      {distance !== null && distance > 0 && (
        <p className={`${mutedClass} -mt-2`}>
          {liane.route_source === "Osrm"
            ? `${distanceLabel(distance)} par la route.`
            : `Environ ${distanceLabel(distance)} à vol d'oiseau.`}
        </p>
      )}

      <Field>
        <Label className={labelClass}>Places pour des passagers</Label>
        <RadioGroup
          value={seats}
          onChange={setSeats}
          className="mt-1 grid grid-cols-6 gap-1"
        >
          {SEAT_CHOICES.map((count) => (
            <Radio
              key={count}
              value={count}
              className={cn(
                toggleClass(seats === count),
                "flex items-center justify-center text-base",
              )}
            >
              {count}
            </Radio>
          ))}
        </RadioGroup>
      </Field>

      {error && !error.field && <Notice>{error.message}</Notice>}

      <div className="flex gap-3">
        <Button type="submit" loading={sending} className="flex-1">
          Proposer ce trajet
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
