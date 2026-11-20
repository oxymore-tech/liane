import type { DaySchedule, Liane } from "@/api/types";
import { cn } from "@/components/utils";
import {
  DAYS,
  firstStopName,
  lastStopName,
  memberCountLabel,
  stopName,
} from "./labels";

export function MemberCount({ liane }: { liane: Liane }) {
  return <p className="text-gris">{memberCountLabel(liane.member_count)}</p>;
}

export function StopList({
  liane,
  highlighted = [],
}: {
  liane: Liane;
  highlighted?: string[];
}) {
  return (
    <ol className="flex flex-col">
      {liane.stops.map((stop, index) => (
        <li key={stop.id} className="flex items-stretch gap-3">
          <span className="flex w-4 flex-col items-center">
            <span className={cn("w-[3px] flex-1", index > 0 && "bg-liane")} />
            <span
              className={cn(
                "h-4 w-4 rounded-full border-[3px] border-liane",
                highlighted.includes(stop.id) ? "bg-pousse" : "bg-white",
              )}
            />
            <span
              className={cn(
                "w-[3px] flex-1",
                index < liane.stops.length - 1 && "bg-liane",
              )}
            />
          </span>
          <span className="py-1.5">
            <span
              className={
                highlighted.includes(stop.id) ? "font-bold" : "font-medium"
              }
            >
              {stopName(stop)}
            </span>
            <span className="block text-sm text-gris">{stop.label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Cell({ members, drivers }: { members: number; drivers: number }) {
  if (members === 0) {
    return <td className="px-2 py-1.5 text-center text-gris">–</td>;
  }
  return (
    <td className="px-2 py-1.5 text-center">
      <span className="font-semibold">{members}</span>
      <span className="block text-xs text-gris">
        {drivers === 0
          ? "aucun conducteur"
          : drivers === 1
            ? "1 conducteur"
            : `${drivers} conducteurs`}
      </span>
    </td>
  );
}

/** « Qui roule quand » : des nombres par jour et par sens, jamais de noms. */
export function ScheduleTable({
  liane,
  schedule,
}: {
  liane: Liane;
  schedule: DaySchedule[];
}) {
  if (liane.member_count === 0) {
    return (
      <p className="text-sm text-gris">
        Personne n'a encore indiqué ses jours. Indiquez les vôtres en rejoignant
        la liane.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">
        Nombre de membres par jour et par sens
      </caption>
      <thead>
        <tr className="text-xs text-gris">
          <th className="py-1 text-left font-medium">Jour</th>
          <th className="px-2 py-1 font-medium">
            {firstStopName(liane)} → {lastStopName(liane)}
          </th>
          <th className="px-2 py-1 font-medium">
            {lastStopName(liane)} → {firstStopName(liane)}
          </th>
        </tr>
      </thead>
      <tbody>
        {schedule.map((day) => (
          <tr key={day.day} className="border-t border-bordure">
            <th className="py-1.5 text-left font-medium">{DAYS[day.day]}</th>
            <Cell
              members={day.outbound_members}
              drivers={day.outbound_drivers}
            />
            <Cell members={day.return_members} drivers={day.return_drivers} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}
