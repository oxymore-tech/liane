import React, { useCallback, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { addHours } from "date-fns";
import {
  DayOfWeek,
  LatLng,
  RallyingPoint,
  RouteStat,
  Trip, TripFilterOptions
} from "@/api";
import { displayService } from "@/api/display-service";
import { rallyingPointService } from "@/api/rallying-point-service";
import { Days, Hours } from "@/api/time";
import { Button } from "@/components/base/Button";
import { Select } from "@/components/base/Select";
import { LoginLogout } from "@/components/LoginLogout";

interface MapProps {
  center: LatLng,
  from: RallyingPoint | undefined,
  to: RallyingPoint | undefined,
  rpUpdate: (from: RallyingPoint, isFrom: boolean) => void,
  callback: (filter: TripFilterOptions) => void,
}

export function TripFilter({ center, rpUpdate, callback }: MapProps) {
  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [searchedTrips, setSearchedTrips] = useState<Trip[]>([]);
  const [steps, setSteps] = useState<RallyingPoint[]>([]);
  const [availableTrips, setAvailableTrips] = useState(false);

  // days count starts at 1 so we have to add an extra day (24 hours) and an extra hour (2 hours)
  const nextHour = addHours(new Date(), 26);
  // True when the last value set between from and to is from
  const [lastFromVsTo, setLastFromVsTo] = useState(true);
  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();
  // Initialized with today
  const [day, setDay] = useState<DayOfWeek>(nextHour.getDay());
  // Initialized with the next hour
  const [startHour, setStartHour] = useState(nextHour.getHours());
  const [endHour, setEndHour] = useState(nextHour.getHours() + 1);

  // Changes start hour when end hour is set before the previous start hour
  const updateStartHour = useCallback((hour: number) => {
    setStartHour(hour);
    if (hour >= endHour) {
      setEndHour(hour + 1);
    }
  }, [endHour]);

  // Changes end hour when start hour is set after the previous end hour
  const updateEndHour = useCallback((hour: number) => {
    setEndHour(hour);
    if (hour <= startHour) {
      setStartHour(hour - 1);
    }
  }, [startHour]);

  function selectMarker(point:RallyingPoint, fromVsTo: boolean) {
    setLastFromVsTo(fromVsTo);

    if (fromVsTo) {
      setFrom(point);
    } else {
      setTo(point);
    }

    rpUpdate(point, fromVsTo);
  }

  // goes throught the closest rallying points from "center", set "from" to the closest RP
  useEffect(() => {
    rallyingPointService.list(center.lat, center.lng)
      .then((r) => {
        const first = r[0];
        if (first) {
          setFrom(first);
        }
        setRallyingPoints(r);
      });
  }, [center]);

  /* Handle the case of "from" and "to" having the same value
  * Sets "to" if "from" was changed last and vice-versa
   */
  useEffect(() => {
    if (from === to) {
      if (lastFromVsTo) {
        setTo(undefined);
      } else {
        setFrom(undefined);
      }
    }
  }, [lastFromVsTo, from, to]);

  // set searchedTrips to the trips corresponding to the research
  const getTrips = useCallback(async () => {
    const trips = await displayService.search(day, from, to, startHour, endHour);
    setSearchedTrips(trips);
  }, [day, from, to, startHour, endHour]);

  /*
  useEffect(() => {
    displayService.getStat(searchedTrips, day, startHour, endHour)
      .then((result) => {
        setRoutes(result);
      });
    displayService.listStepsFrom(searchedTrips)
      .then((result) => setSteps(result));
  }, [searchedTrips, day, startHour, endHour]); */

  return (
    <div>
      {/* availableTrips
            && <AvailableTrips searchedTrips={searchedTrips} /> */}
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
