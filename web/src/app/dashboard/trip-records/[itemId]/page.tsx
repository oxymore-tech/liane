"use client";
import { useQuery } from "react-query";
import { useAppServices } from "@/components/ContextProvider";
import Map, { useMapContext } from "@/components/map/Map";
import React, { useEffect, useMemo, useState } from "react";
import maplibregl from "maplibre-gl";
import { FeatureCollection } from "geojson";
import { RallyingPoint } from "@liane/common";
import { Card } from "flowbite-react";
import { TripRecord } from "@/api/api";
import { TimelineChart, TimelineData } from "@/components/charts/timeline/Timeline";
import { IconButton } from "@/components/base/IconButton";
import { useRouter } from "next/navigation";

const TripView = ({ record }: { record: TripRecord }) => {
  const trip = record.wayPoints[0].rallyingPoint.city + " → " + record.wayPoints[record.wayPoints.length - 1].rallyingPoint.city;
  const router = useRouter();
  return (
    <div className="px-4 py-2 absolute z-50">
      <Card>
        <div className="grid gap-4" style={{ gridTemplateColumns: "auto 1fx", gridTemplateRows: "auto 1fx" }}>
          <IconButton className={"row-start-1 col-start-1"} aria-label="Close" icon="close" onClick={() => router.back()} />

          <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white row-start-1 col-start-2">{trip}</h5>
          <div className="font-normal text-gray-700 dark:text-gray-400 col-start-2 row-start-2">
            <p className="font-normal text-gray-700 dark:text-gray-400">{new Date(record.startedAt).toLocaleDateString()}</p>
            <p className="font-normal text-gray-700 dark:text-gray-400 ">Trajet démarré à {new Date(record.startedAt).toLocaleTimeString()}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Legend = ({ users, startDate, endDate }: { users: TimelineData; startDate: Date; endDate: Date }) => {
  return (
    <div className="px-4 py-6 absolute bottom-0 z-50 w-3/4">
      <Card>
        <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Membres</h5>
        <TimelineChart data={users} startDate={startDate} endDate={endDate} />
      </Card>
    </div>
  );
};

export default function TripRecordItemPage({ params }: { params: { itemId: string } }) {
  const services = useAppServices()!;
  const { data: pings } = useQuery(["record_pings", params.itemId], () => services.record.getRecordPings(params.itemId));
  const { data: record } = useQuery(["liane", params.itemId], () => services.record.get(params.itemId));
  const from = record?.wayPoints[0];
  const to = record ? record.wayPoints[record.wayPoints.length - 1] : undefined;
  const [userList, setUserList] = useState<string[]>([]);
  const users = useMemo(() => {
    if (!record || !pings) return [] as TimelineData;

    return userList.map((u, i) => ({
      user: record.members.find(m => m.user.id === u)!.user,
      color: colors[i],
      points: pings.features.filter(f => f.properties.user === u).map(f => new Date(f.properties.at))
    }));
  }, [userList, record, pings]);
  return (
    <div className="grow w-full">
      {!!record && <TripView record={record} />}
      {!!record && (
        <Legend startDate={new Date(record.startedAt)} endDate={record.finishedAt ? new Date(record.finishedAt) : new Date(to!.eta)} users={users} />
      )}
      <Map center={from?.rallyingPoint.location}>
        {from && to && <RouteLayer from={from.rallyingPoint} to={to.rallyingPoint} />}
        {pings && <MarkersLayer features={pings} setUserList={setUserList} />}
      </Map>
    </div>
  );
}
const colors = ["#0080ff", "#522b1d", "#00cc54", "#ff0088", "#ff3c00"];
function MarkersLayer({
  features,
  setUserList
}: {
  features: FeatureCollection<GeoJSON.Point, { user: string; at: string }>;
  setUserList: (users: string[]) => void;
}) {
  const map = useMapContext();

  useEffect(() => {
    if (!map.current) return;
    let users: string[] = [];
    const markers = features.features.map(f => {
      let foundIndex = users.indexOf(f.properties.user);
      if (foundIndex < 0) {
        foundIndex = users.length;
        users.push(f.properties.user);
      }

      const popup = new maplibregl.Popup({ offset: 25, className: "liane-popup" }).setHTML(
        `<div class="dark:bg-gray-800 py-5 px-4 rounded"><p>${new Date(f.properties.at).toLocaleString()}</p></div>`
      );

      return new maplibregl.Marker({ color: colors[foundIndex] })
        .setLngLat([f.geometry.coordinates[0], f.geometry.coordinates[1]])
        .setPopup(popup)
        .addTo(map.current!);
    });
    setUserList(users);
    return () => markers.forEach(m => m.remove());
  }, [features, map, setUserList]);
  return <></>;
}

function RouteLayer({ from, to }: { from: RallyingPoint; to: RallyingPoint }) {
  const map = useMapContext();
  const services = useAppServices()!;
  const id = "route_" + from.id + "_" + to.id;
  const { data: route } = useQuery(id, () => {
    return services.routing.getRoute([from.location, to.location]);
  });
  const mapFeatures = useMemo(() => {
    if (!route || route.geometry.coordinates.length === 0) {
      return undefined;
    }

    const features: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: route.geometry.coordinates.map((line): GeoJSON.Feature => {
        return {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: line
          }
        };
      })
    };

    return features;
  }, [route]);

  useEffect(() => {
    map.current?.once("load", () => {
      if (!map.current || !mapFeatures || map.current?.getSource(id)) {
        return;
      }
      map.current?.addSource(id, {
        type: "geojson",
        data: mapFeatures
      });
      map.current?.addLayer({
        id,
        source: id,
        type: "line",
        paint: {
          "line-color": "#131870",
          "line-width": 3
        }
      });
      return () => {
        map.current?.removeLayer(id);
        map.current?.removeSource(id);
      };
    });
  }, [map, id, mapFeatures]);
  return <></>;
}
