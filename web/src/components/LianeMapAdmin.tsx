import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { LatLng, RallyingPoint, RawTrip, UserLocation } from "@/api";
import { RallyingPointMarker } from "@/components/RallyingPointMarker";
import { rallyingPointService } from "@/api/rallying-point-service";
import { adminService } from "@/api/admin-service";

interface MapProps {
  className?: string;
  center: LatLng;
}
const Augustin = require("@/api/augustin.json");

function LianeMapAdmin({ className, center }: MapProps) {

  const [rallyingPoints, setRallyingPoints] = useState<RallyingPoint[]>([]);
  const [rawTrips, setRawTrips] = useState<RawTrip[]>([]);
  const [displayRawTrips, setDisplayRawTrips] = useState<RawTrip[]>([]);

  useEffect(() => {
    adminService.getAllRawTrips()
      .then((r) => {
        setRawTrips(r);
      });
  });

  useEffect(() => {
    setDisplayRawTrips(rawTrips);
  });

  useEffect(() => {
    rallyingPointService.list(center.lat, center.lng)
      .then((r) => {
        setRallyingPoints(r);
      });
  }, [center]);

  return (
    <div>
      <MapContainer
        className={className}
        center={center}
        zoom={10}
        scrollWheelZoom
        dragging
        touchZoom={false}
        style={{ zIndex: 0, position: "relative" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          zIndex={2}
        />
        { /* displayRallyingPoints ? */ rallyingPoints.map(
          (point, index) => (
            <RallyingPointMarker
              key={`rl_${index}`}
              value={point}
              onSelect={() => {}}
            />
          )
        )/* : null */}
        {displayRawTrips.map((a:RawTrip, index:number) => (
            {
                a.location
            }
          <CircleMarker key={`a_${index}`} center={[a.latitude, a.longitude]} pathOptions={{ color: "red" }} radius={10}>
            <Tooltip>
              <p>
                {new Intl.DateTimeFormat(
                  "fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }
                ).format(new Date(a.timestamp))}
              </p>
              <p>{a.speed}</p>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default LianeMapAdmin;