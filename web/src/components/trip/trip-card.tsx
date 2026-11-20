import Link from "next/link";
import type { Trip } from "@/api/types";
import { PointRoute } from "@/components/rallying-point/point-name";
import {
  Badge,
  type BadgeTone,
  Card,
  Chevron,
  mutedClass,
} from "@/components/ui";
import { seatsLabel, stateLabel, tripDateLabel } from "./labels";

const STATE_TONES: Record<Trip["state"], BadgeTone> = {
  Planned: "pale",
  Started: "selected",
  Finished: "neutral",
  Canceled: "danger",
};

export function StateBadge({ trip }: { trip: Trip }) {
  const tone =
    trip.state === "Canceled"
      ? STATE_TONES.Canceled
      : trip.is_open
        ? STATE_TONES[trip.state]
        : STATE_TONES.Finished;
  return <Badge tone={tone}>{stateLabel(trip)}</Badge>;
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
    <Link href={`/trajet/${trip.id}`} className="group block rounded-card">
      <Card className="flex items-center gap-2 transition-colors group-hover:border-liane group-active:bg-pale">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold">{tripDateLabel(trip.departure_time)}</h3>
            <StateBadge trip={trip} />
          </div>
          <p>
            <PointRoute from={trip.from_stop} to={trip.to_stop} />
          </p>
          <p className={mutedClass}>
            {roleLabel(trip)}
            {trip.is_open &&
              trip.state === "Planned" &&
              ` · ${seatsLabel(trip)}`}
          </p>
          {showLiane && <p className={mutedClass}>Liane {trip.liane.name}</p>}
        </div>
        <Chevron className="-rotate-90" />
      </Card>
    </Link>
  );
}
