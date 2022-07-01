import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { addHours } from "date-fns";
import { DayOfWeek, RallyingPoint } from "@/api";
import { Days, Hours } from "@/api/time";
import { Button } from "@/components/base/Button";
import { Select } from "@/components/base/Select";
import { LoginLogout } from "@/components/LoginLogout";
import { Loading } from "@/components/base/Loading";

interface TripFilterProps {
  rallyingPoints: RallyingPoint[],
  newFrom: RallyingPoint | undefined,
  newTo: RallyingPoint | undefined,
  rpUpdate: (from: RallyingPoint, isFrom: boolean) => void,
  loading: boolean,
  callback: (dayFrom?: number, dayTo?: number, hourFrom?: number, hourTo?: number) => void,
}

export function TripFilter({ newFrom, newTo, rallyingPoints, rpUpdate, loading, callback }: TripFilterProps) {
  // Days count starts at 1 so we have to add an extra day (24 hours) and an extra hour (2 hours)
  const nextHour = addHours(new Date(), 26);

  // Filter options
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();
  const [day, setDay] = useState<DayOfWeek>(nextHour.getDay());
  const [startHour, setStartHour] = useState(nextHour.getHours());
  const [endHour, setEndHour] = useState(nextHour.getHours() + 1);

  // Initialize the filter
  useEffect(() => {
    setFrom(newFrom);
    setTo(newTo);
  }, [newFrom, newTo]);

  // Changes the day
  const updateDay = (d: number) => {
    setDay(d);
  };

  // Changes start hour when end hour is set before the previous start hour
  const updateStartHour = (hour: number) => {
    setStartHour(hour);
    if (hour >= endHour) setEndHour(hour + 1);
  };

  // Changes end hour when start hour is set after the previous end hour
  const updateEndHour = (hour: number) => {
    setEndHour(hour);
    if (hour <= startHour) setStartHour(hour - 1);
  };

  const selectMarker = (point:RallyingPoint, fromVsTo: boolean) => {
    if (fromVsTo) {
      setFrom(point);
    } else {
      setTo(point);
    }

    rpUpdate(point, fromVsTo);
  };

  return (
    <div className="absolute top-0 right-0 z-10 overflow-auto">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-10 gap-2 m-10">
        <LoginLogout className="col-span-2" />
        <Select
          className="col-span-2"
          label={(
            <span className="flex items-center">
              <img alt="" src="/images/leaflet/marker-icon.png" className="m-2 h-6" />
              Départ
            </span>
          )}
          options={rallyingPoints}
          value={from}
          placeholder="Sélectionnez un lieu"
          onChange={(p) => selectMarker(p, true)}
        />
        <Select
          className="col-span-2"
          label={(
            <span className="flex items-center">
              <img alt="" src="/images/leaflet/marker-icon-red.png" className="m-2 h-6" />
              Arrivée
            </span>
          )}
          options={rallyingPoints}
          value={to}
          placeholder="Sélectionnez un lieu"
          onChange={(p) => selectMarker(p, false)}
        />
        <Select
          className="col-span-2"
          label={(
            <span className="flex items-center">
              <i className="mdi mdi-calendar-today m-2 text-xl" />
              Jour
            </span>
          )}
          placeholder="Sélectionnez un jour"
          options={Days}
          keyExtract="value"
          value={day}
          onChange={updateDay}
        />
        <Select
          label="Entre"
          inline
          options={Hours.filter((h) => h.value !== 24)}
          keyExtract="value"
          value={startHour}
          onChange={updateStartHour}
          placeholder="Sélectionnez une heure"
        />
        <Select
          label=" et "
          inline
          options={Hours.filter((h) => h.value !== 1)}
          keyExtract="value"
          value={endHour}
          onChange={updateEndHour}
          placeholder="Sélectionnez une heure"
        />
        <Button
          color="orange"
          className="mt-4 col-span-2"
          label="Rechercher"
          onClick={() => callback(day === 7 ? undefined : day - 1, day === 7 ? undefined : day - 1, startHour - 1, endHour - 1)}
        />
        <Loading className={`${loading && "mt-5 col-span-2"}`} loading={loading} />
      </div>
    </div>
  );
}
