"use client";
import { useQuery } from "react-query";
import { useAppServices } from "@/components/ContextProvider";
import Map, { useMapContext } from "@/components/map/Map";
import React, { useEffect, useMemo, useState } from "react";
import { FeatureCollection } from "geojson";
import { asPoint, LianeMember, RallyingPoint } from "@liane/common";
import { Card } from "flowbite-react";
import { TripRecord } from "@/api/api";
import { dispatchHighlightPointEvent, TimelineChart, TimelineData } from "@/components/charts/timeline/Timeline";
import { IconButton } from "@/components/base/IconButton";
import { useRouter } from "next/navigation";
import { dispatchCustomEvent, useEvent } from "@/utils/hooks";
import { RouteLayer } from "@/components/map/layers/RouteLayer";
import { MarkersLayer } from "@/components/map/layers/base/MarkersLayer";
import { FitFeatures } from "@/components/map/FitFeatures";
import { useLocalization } from "@/api/intl";
import { WebLogger } from "@/api/logger";

const TripView = ({ record }: { record: TripRecord }) => {
  const WebLocalization = useLocalization();
  const trip = record.wayPoints[0].rallyingPoint.city + " → " + record.wayPoints[record.wayPoints.length - 1].rallyingPoint.city;
  const router = useRouter();
  return (
    <div className="px-4 py-2 absolute z-[5]">
      <Card>
        <div className="grid gap-4" style={{ gridTemplateColumns: "auto 1fx", gridTemplateRows: "auto 1fx" }}>
          <IconButton className={"row-start-1 col-start-1"} aria-label="Close" icon="close" onClick={() => router.back()} />

          <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white row-start-1 col-start-2">{trip}</h5>
          <div className="font-normal text-gray-700 dark:text-gray-400 col-start-2 row-start-2">
            <p className="font-normal text-gray-700 dark:text-gray-400">{WebLocalization.formatDate(new Date(record.startedAt))}</p>
            <p className="font-normal text-gray-700 dark:text-gray-400 ">
              Trajet démarré à {WebLocalization.formatTime24h(new Date(record.startedAt))}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

type RecordUserData = Omit<Omit<LianeMember, "from">, "to"> & { from: RallyingPoint; to: RallyingPoint };

const milliInADay = 3600 * 24 * 1000;
const generateId = (userIndex: number, startDate: Date, d: Date) => {
  // Use a function returning a positive integer as it is required for feature ids in maplibre
  // The result is within int32 range for a delta of less than 24 hours and less than a dozen users
  return userIndex * milliInADay + (d.getTime() - startDate.getTime()) + 1;
};
export default function TripRecordItemPage({ params }: { params: { itemId: string } }) {
  const WebLocalization = useLocalization();
  const services = useAppServices()!;
  const { data: pings } = useQuery(["record_pings", params.itemId], () => services.record.getRecordPings(params.itemId));
  const { data: record } = useQuery(["liane", params.itemId], () => services.record.get(params.itemId));
  const from = record?.wayPoints[0];
  const to = record ? record.wayPoints[record.wayPoints.length - 1] : undefined;
  const [userList, setUserList] = useState<string[]>([]);
  const startDate = useMemo(() => (record ? new Date(record.startedAt) : null), [record]);
  const users: TimelineData<RecordUserData> = useMemo(() => {
    if (!record || !pings) return [];

    return userList.map((u, i) => {
      const member = record.members.find(m => m.user.id === u)!;
      return {
        data: {
          ...member,
          to: record.wayPoints.find(w => w.rallyingPoint.id === member.to)!.rallyingPoint,
          from: record.wayPoints.find(w => w.rallyingPoint.id === member.from)!.rallyingPoint
        },
        color: colors[i],
        points: pings.features.filter(f => f.properties.user === u).map(f => new Date(f.properties.at))
      };
    });
  }, [userList, record, pings]);
  const coloredFeatures = useMemo(() => {
    let users: string[] = [];
    if (!pings || !record) {
      return null;
    }
    const coloredFeatures = {
      ...pings,
      features: pings.features.map((f, i) => {
        let foundIndex = users.indexOf(f.properties.user);
        if (foundIndex < 0) {
          foundIndex = users.length;
          users.push(f.properties.user);
        }
        const date = new Date(f.properties.at);
        return {
          ...f,
          id: generateId(foundIndex, startDate!, date),
          properties: { ...f.properties, color: colors[foundIndex] }
        };
      })
    };
    setUserList(users);
    return coloredFeatures;
  }, [pings, record, startDate]);

  return (
    <div className="grow w-full relative">
      {!!record && <TripView record={record} />}
      {!!record && (
        <div className="px-4 py-6 absolute bottom-0 z-[5] w-full">
          <Card>
            <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Membres</h5>
            <TimelineChart
              data={users}
              startDate={startDate!}
              endDate={record.finishedAt ? new Date(record.finishedAt) : new Date(to!.eta)}
              idExtractor={(m, date) =>
                generateId(
                  userList.findIndex(u => u === m.user.id!),
                  startDate!,
                  date
                )
              }
              labelExtractor={m => m.user.pseudo}
              renderTooltip={m => {
                return (
                  <div>
                    <span style={{ whiteSpace: "nowrap" }}>{m.from.label + " → " + m.to.label}</span>
                    <br />
                    {!!m.departure && (
                      <>
                        <span>Départ: {WebLocalization.formatTime24h(new Date(m.departure))}</span>
                        <br />
                      </>
                    )}
                    {!!m.cancellation && (
                      <>
                        <span>Annulation: {WebLocalization.formatTime24h(new Date(m.cancellation))}</span>
                        <br />
                      </>
                    )}
                    <span>Géolocalisation: {m.geolocationLevel !== "None" ? "oui" : "non"}</span>
                    <br />
                  </div>
                );
              }}
              onHoveredStateChanged={(id, hovered) => {
                dispatchHighlightMarkerEvent({ id, highlight: hovered });
              }}
              onClick={id => dispatchCenterMarkerEvent({ id })}
            />
          </Card>
        </div>
      )}
      <Map center={from?.rallyingPoint.location}>
        {!!record && <RouteLayer points={record.wayPoints.map(w => w.rallyingPoint)} />}
        {!!coloredFeatures && <PingsMarkersLayer features={coloredFeatures!} />}
        {!!record && !!coloredFeatures && (
          <FitFeatures features={[...coloredFeatures.features, ...record.wayPoints.map(w => asPoint(w.rallyingPoint.location))]} />
        )}
      </Map>
    </div>
  );
}
const colors = ["#0080ff", "#522b1d", "#00cc54", "#ff0088", "#ff3c00"];

type HighlightPingMarkerEvent = { id: number; highlight: boolean };
const HighlightPingMarkerEventName = "highlightPingMarker";
type CenterPingMarkerEvent = { id: number };
const CenterPingMarkerEventName = "centerPingMarker";
const dispatchHighlightMarkerEvent = (payload: HighlightPingMarkerEvent) => dispatchCustomEvent(HighlightPingMarkerEventName, payload);
const dispatchCenterMarkerEvent = (payload: CenterPingMarkerEvent) => dispatchCustomEvent(CenterPingMarkerEventName, payload);

function PingsMarkersLayer({ features }: { features: FeatureCollection<GeoJSON.Point, { user: string; at: string; color: string }> }) {
  const map = useMapContext();

  useEvent(HighlightPingMarkerEventName, (e: HighlightPingMarkerEvent) => {
    map.current?.setFeatureState({ source: "pings", id: e.id }, { hover: e.highlight });
  });
  useEvent(CenterPingMarkerEventName, (e: CenterPingMarkerEvent) => {
    const f = features.features.find(f => f.id === e.id)!;
    map.current?.flyTo({ center: [f.geometry.coordinates[0], f.geometry.coordinates[1]], animate: true });
  });

  useEffect(() => {
    const mmap = map.current;
    mmap?.once("load", () => {
      if (!mmap || mmap.getSource("pings")) return;

      mmap?.addSource("pings", {
        type: "geojson",
        data: features
      });

      return () => {
        if (!mmap?.loaded()) return;
        mmap?.removeSource("pings");
      };
    });
  }, [features, map]);

  return useMemo(() => {
    return (
      <MarkersLayer
        id={"pings"}
        source={"pings"}
        onMouseEnterPoint={f => {
          WebLogger.info("PING", f.properties);
          const id = f.id as number;
          dispatchHighlightPointEvent({ id, highlight: true });
          map.current?.setFeatureState({ source: "pings", id }, { hover: true });
        }}
        onMouseLeavePoint={id => {
          dispatchHighlightPointEvent({ id, highlight: false });
          map.current?.setFeatureState({ source: "pings", id }, { hover: false });
        }}
        props={{
          layout: {
            "icon-size": 0.8
          },
          paint: {
            "icon-color": ["get", "color"],
            "icon-halo-color": "#0F172A",
            "icon-halo-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 0.6]
          }
        }}
      />
    );
  }, [map]);
}
