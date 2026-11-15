"use client";

import { type FormEvent, useState } from "react";
import { createTrip } from "@/api/trips";
import type { Liane, Membership, TripDetail, TripDirection } from "@/api/types";
import {
  distanceLabel,
  firstStopName,
  lastStopName,
  sectionDistance,
  stopName,
} from "@/components/liane/labels";
import { Button, fieldClass, Notice } from "@/components/ui";

const SEAT_CHOICES = [1, 2, 3, 4, 5, 6];
const DEFAULT_SEATS = 3;
const DEFAULT_TIME = "07:30";

const pad = (value: number) => String(value).padStart(2, "0");

const localDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDate(date);
};

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
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
      setError("Indiquez le jour et l'heure du départ.");
      return;
    }
    if (departure.getTime() < Date.now()) {
      setError("Cette heure est déjà passée.");
      return;
    }
    if (indexOf(section.fromId) >= indexOf(section.toId)) {
      setError(
        "L'arrivée doit se trouver après le départ, dans le sens choisi.",
      );
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
      setError(
        "Le trajet n'a pas été enregistré. Vérifiez le jour et l'heure.",
      );
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-sm font-medium">Dans quel sens ?</legend>
        <div className="mt-1 grid grid-cols-1 gap-2">
          {(["Outbound", "Return"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={direction === choice}
              onClick={() => changeDirection(choice)}
              className={`min-h-11 rounded-lg border px-3 text-left font-semibold ${
                direction === choice
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {choice === "Outbound"
                ? `${firstStopName(liane)} → ${lastStopName(liane)}`
                : `${lastStopName(liane)} → ${firstStopName(liane)}`}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Jour
          <input
            type="date"
            className={fieldClass}
            required
            min={localDate(new Date())}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Heure de départ
          <input
            type="time"
            className={fieldClass}
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      </div>

      <label className="text-sm font-medium">
        Je pars de
        <select
          className={fieldClass}
          value={section.fromId}
          onChange={(event) =>
            setSection({ ...section, fromId: event.target.value })
          }
        >
          {stops.slice(0, -1).map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stopName(stop)}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Je vais jusqu'à
        <select
          className={fieldClass}
          value={section.toId}
          onChange={(event) =>
            setSection({ ...section, toId: event.target.value })
          }
        >
          {stops.slice(1).map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stopName(stop)}
            </option>
          ))}
        </select>
      </label>

      {distance !== null && distance > 0 && (
        <p className="-mt-2 text-sm text-gray-600">
          {liane.route_source === "Osrm"
            ? `${distanceLabel(distance)} par la route.`
            : `Environ ${distanceLabel(distance)} à vol d'oiseau.`}
        </p>
      )}

      <label className="text-sm font-medium">
        Places pour des passagers
        <select
          className={fieldClass}
          value={seats}
          onChange={(event) => setSeats(Number(event.target.value))}
        >
          {SEAT_CHOICES.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </label>

      {error && <Notice>{error}</Notice>}

      <div className="flex gap-3">
        <Button type="submit" disabled={sending} className="flex-1">
          Proposer ce trajet
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
