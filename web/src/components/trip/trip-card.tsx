import Link from "next/link";
import type { Trip } from "@/api/types";
import { Card } from "@/components/ui";
import { seatsLabel, stateLabel, tripDateLabel, tripSection } from "./labels";

const STATE_STYLES = {
  Planned: "bg-emerald-100 text-emerald-800",
  Started: "bg-amber-100 text-amber-900",
  Finished: "bg-gray-200 text-gray-700",
  Canceled: "bg-red-100 text-red-800",
};

export function StateBadge({ trip }: { trip: Trip }) {
  const style =
    trip.state === "Canceled"
      ? STATE_STYLES.Canceled
      : trip.is_open
        ? STATE_STYLES[trip.state]
        : STATE_STYLES.Finished;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}
    >
      {stateLabel(trip)}
    </span>
  );
}

const roleLabel = (trip: Trip) => {
  if (trip.my_role === "Driver") return "Vous conduisez";
  if (trip.my_role === "Passenger") {
    return `Vous avez une place · conduit par ${trip.driver.pseudo ?? "un membre"}`;
  }
  return `Conduit par ${trip.driver.pseudo ?? "un membre"}`;
};

export function TripCard({
  trip,
  showLiane = false,
}: {
  trip: Trip;
  showLiane?: boolean;
}) {
  return (
    <Link href={`/trajet/${trip.id}`} className="block">
      <Card className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold">{tripDateLabel(trip.departure_time)}</h3>
          <StateBadge trip={trip} />
        </div>
        <p>{tripSection(trip)}</p>
        <p className="text-sm text-gray-600">
          {roleLabel(trip)}
          {trip.is_open && trip.state === "Planned" && ` · ${seatsLabel(trip)}`}
        </p>
        {showLiane && (
          <p className="text-sm text-gray-500">Liane {trip.liane.name}</p>
        )}
      </Card>
    </Link>
  );
}
