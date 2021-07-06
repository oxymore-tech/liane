import React, { useCallback, useState } from "react";
import { Select } from "@/components/base/Select";
import { Button } from "@/components/base/Button";
import { FilterOptions } from "@/components/LianeMap";
import {
  DayOfWeek, RallyingPoint, Route, RouteStat, Trip
} from "@/api";
import { AvailableTrips } from "@/components/available_trips";
import { LoginLogout } from "@/components/LoginLogout";
import { Days, Hours } from "@/api/time";
import { addHours } from "date-fns";
import { displayService } from "@/api/display-service";

interface FilterProps {
  callback: (filterOptions: FilterOptions) => void
}

export function LianeMapFilters({ callback }: FilterProps) {

  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [searchedTrips, setSearchedTrips] = useState<Trip[]>([]);
  const [availableTrips, setAvailableTrips] = useState(false);
  const [showRallyingPoints, setShowRallyingPoints] = useState(false);

  const nextHour = addHours(new Date(), 1);

  const [lastFromVsTo, setLastFromVsTo] = useState(true);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();
  const [day, setDay] = useState<DayOfWeek>(nextHour.getDay());
  const [startHour, setStartHour] = useState(nextHour.getHours());
  const [endHour, setEndHour] = useState(nextHour.getHours() + 1);

  function cb() {
    callback({
      rallyingPoints,
      routes,
      searchedTrips,
      availableTrips,
      showRallyingPoints
    });
  }

  const selectMarker = (point:RallyingPoint, fromVsTo: boolean) => {
    setLastFromVsTo(fromVsTo);
    if (fromVsTo) {
      setFrom(point);
    } else {
      setTo(point);
    }
  };

  const getTrips = useCallback(async () => {
    const trips = await displayService.search(day, from, to, startHour, endHour);
    setSearchedTrips(trips);
  }, [day, from, to, startHour, endHour]);

  const updateStartHour = useCallback((hour: number) => {
    setStartHour(hour);
    if (hour >= endHour) {
      setEndHour(hour + 1);
    }
  }, [endHour]);

  const updateEndHour = useCallback((hour: number) => {
    setEndHour(hour);
    if (hour <= startHour) {
      setStartHour(hour - 1);
    }
  }, [startHour]);

  return (
    <div>
      {availableTrips
          && <AvailableTrips searchedTrips={searchedTrips} />}
      <div className="absolute inset-y-0 right-0 z-10">
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
            onChange={(p) => selectMarker(p, false)}
            placeholder="Sélectionnez un lieu"
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
            onChange={setDay}
          />
          <Select
            label="Entre"
            inline
            options={Hours.filter((h) => h.value !== 23)}
            keyExtract="value"
            value={startHour}
            onChange={updateStartHour}
            placeholder="Sélectionnez une heure"
          />
          <Select
            label=" et "
            inline
            options={Hours.filter((h) => h.value !== 0)}
            keyExtract="value"
            value={endHour}
            onChange={updateEndHour}
            placeholder="Sélectionnez une heure"
          />
          <Button
            color="orange"
            className="mt-4 col-span-2"
            label="Rechercher"
            onClick={getTrips}
          />
        </div>
      </div>
    </div>
  );
}