import React, { useState } from "react";
import { Switch } from "@/components/base/Switch";
import { Select } from "@/components/base/Select";
import { TextInput } from "@/components/base/TextInput";
import { Button } from "@/components/base/Button";
import { IndexedRawTrip, TripFilter } from "@/api";
import { adminService } from "@/api/admin-service";
import { LoginLogout } from "@/components/LoginLogout";
import { Days, Hours } from "@/api/time";
import { addHours } from "date-fns";

interface FilterProps {
  callback: (filterOptions: TripFilter) => void
}

/* function extractIndex(rawTrips: IndexedRawTrip[]) {
  let indexes = new Set<number|string>();
  indexes = indexes.add("Tous les trajets");
  rawTrips.forEach((r: IndexedRawTrip) => {
    indexes = indexes.add(r.index);
  });
  return indexes;
}

function extractUsers(rawTrips: IndexedRawTrip[]) {
  let users = new Set<string>();
  users = users.add("Tous les utilisateurs");
  rawTrips.forEach((r: IndexedRawTrip) => {
    users = users.add(r.user);
  });

  return users;
} */

export function FiltersAdmin({ callback, rawTrips }: FilterProps) {

  /* const [displayRawTrips, setDisplayRawTrips] = useState(true);
  const [displayRallyingPoints, setDisplayRallyingPoints] = useState(false);
  const [allUsers, setAllUsers] = useState(true);
  const [chosenUser, setChosenUser] = useState<string>();
  const [allTrips, setAllTrips] = useState(true);
  const [chosenTrip, setChosenTrip] = useState<number>();
  const [displayBackground, setDisplayBackground] = useState(true);
  const [displayForeground, setDisplayForeground] = useState(true);
  const [distanceBetweenPoints, setDistanceBetweenPoints] = useState<number>();
  const [timeBetweenPoints, setTimeBetweenPoints] = useState<number>();

  function cb() {
    callback({
      displayRawTrips,
      displayRallyingPoints,
      allUsers,
      chosenUser,
      displayBackground,
      displayForeground,
      distanceBetweenPoints,
      timeBetweenPoints,
      allTrips,
      chosenTrip
    });
  }

  function selectTripController(id) {
    if ((typeof id === "string") || (id === 0)) {
      setAllTrips(true);
    } else {
      setAllTrips(false);
    }
    setChosenTrip(id);
  }
  const nextHour = addHours(new Date(), 1);

  function selectUserController(user) {
    if (user === "Tous les utilisateurs") {
      setAllUsers(true);
    } else {
      setAllUsers(false);
    }
    setChosenUser(user);
  } */

  return (
    <div className="absolute inset-y-0 right-0 z-10">
      {/* <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-10 gap-2 m-10">
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
      </div> */}
    </div>
  );
}
