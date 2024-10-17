"use client";
import { useAppServices } from "@/components/ContextProvider";
import Map, { useMapContext } from "@/components/map/Map";
import React, { PropsWithChildren, useMemo, useState } from "react";
import { FeatureCollection, GeoJSON } from "geojson";
import { asPoint, LianeMember, RallyingPoint } from "@liane/common";
import { Button, Card, ToggleSwitch } from "flowbite-react";
import { TripRecord } from "@/api/api";
import { dispatchHighlightPointEvent, TimelineChart, TimelineData } from "@/components/charts/timeline/Timeline";
import { IconButton } from "@/components/base/IconButton";
import { useRouter } from "next/navigation";
import { dispatchCustomEvent, useEvent } from "@/utils/hooks";
import { RouteLayer } from "@/components/map/layers/RouteLayer";
import { MarkersLayer } from "@/components/map/layers/base/MarkersLayer";
import { FitFeatures } from "@/components/map/FitFeatures";
import { useLocalization } from "@/api/intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GeojsonSource } from "@/components/map/GeojsonSource";
import { Popup } from "@/components/map/Popup";
import { RallyingPointsLayer } from "@/components/map/layers/RallyingPointsLayer";

const RegenButton = ({ id }: { id: string }) => {
  const [loading, setLoading] = useState(false);
  const services = useAppServices();
  const queryClient = useQueryClient();
  return (
    <Button
      isProcessing={loading}
      onClick={async () => {
        setLoading(true);
        await services.record.recreate(id);
        setLoading(false);
        await queryClient.invalidateQueries({ queryKey: ["liane", id] });
        await queryClient.invalidateQueries({ queryKey: ["record_pings", id, false] });
      }}>
      Régénérer le rapport
    </Button>
  );
};

const TripView = ({ record, children }: { record: TripRecord } & PropsWithChildren) => {
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
            {children}
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
  const [useRawPings, setUseRawPings] = useState(false);
  const { data: pings } = useQuery({
    queryKey: ["record_pings", params.itemId, useRawPings],
    queryFn: () => services.record.getRecordPings(params.itemId, useRawPings)
  });
  const { data: record } = useQuery({ queryKey: ["liane", params.itemId], queryFn: () => services.record.get(params.itemId) });
  const from = record?.wayPoints[0];
  const to = record ? record.wayPoints[record.wayPoints.length - 1] : undefined;
  const [userList, setUserList] = useState<string[]>([]);
  const [displayMembers, setDisplayMembers] = useState(false);
  const startDate = useMemo(() => (record ? new Date(record.startedAt) : null), [record]);
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
    setDisplayMembers(!users.includes("car"));
    return coloredFeatures;
  }, [pings, record, startDate]);

  const users: TimelineData<RecordUserData> = useMemo(() => {
    if (!record || !pings) return [];

    return userList
      .filter(u => u !== "car")
      .map((u, i) => {
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

  const car = useMemo(() => {
    if (!record || !pings) return null;
    const carIndex = userList.findIndex(u => u === "car");
    if (carIndex < 0) return null;
    return [
      { color: colors[carIndex], data: {}, points: pings.features.filter(f => f.properties.user === "car").map(f => new Date(f.properties.at)) }
    ];
  }, [record, pings, userList]);

  const endDate = record ? (record.finishedAt ? new Date(record.finishedAt) : new Date(to!.eta)) : undefined;

  const markerFeatures = useMemo(() => {
    return displayMembers || !coloredFeatures
      ? coloredFeatures
      : { ...coloredFeatures, features: coloredFeatures?.features.filter(f => f.properties.user === "car") };
  }, [coloredFeatures, displayMembers]);

  // @ts-ignore
  const lastPing = useMemo(() => {
    if (!pings) return undefined;
    const sorted = pings!.features.map(f => new Date(f.properties.at)).sort((a, b) => a.getTime() - b.getTime());
    return sorted.pop();
  }, [pings]);

  return (
    <div className="grow w-full relative">
      {!!record && (
        <TripView record={record}>
          <div>
            <RegenButton id={params.itemId} />
          </div>
        </TripView>
      )}
      {!!record && (
        <div className="px-4 py-6 absolute bottom-0 z-[5] w-full">
          <Card>
            <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Membres</h5>
            {car && (
              <TimelineChart
                data={car}
                startDate={startDate!}
                endDate={endDate!}
                extendedEndDate={lastPing}
                idExtractor={(_, date) =>
                  generateId(
                    userList.findIndex(u => u === "car"),
                    startDate!,
                    date
                  )
                }
                labelExtractor={_ => "Voiture"}
                onHoveredStateChanged={(id, hovered) => {
                  dispatchHighlightMarkerEvent({ id, highlight: hovered });
                }}
                onClick={id => dispatchCenterMarkerEvent({ id })}
              />
            )}
            <div className="flex gap-2 flex-row">
              <span>Afficher tous les membres</span>
              <ToggleSwitch
                checked={displayMembers}
                onChange={() => {
                  setDisplayMembers(prev => !prev);
                }}
              />
            </div>
            {displayMembers && (
              <TimelineChart
                data={users}
                startDate={startDate!}
                endDate={endDate!}
                extendedEndDate={lastPing}
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
                      <span>Géolocalisation activée: {m.geolocationLevel !== "None" ? "oui" : "non"}</span>
                      <br />
                    </div>
                  );
                }}
                onHoveredStateChanged={(id, hovered) => {
                  dispatchHighlightMarkerEvent({ id, highlight: hovered });
                }}
                onClick={id => dispatchCenterMarkerEvent({ id })}
              />
            )}
          </Card>
        </div>
      )}
      <Map center={from?.rallyingPoint.location}>
        <RallyingPointsLayer />
        {!!record && <RouteLayer points={record.wayPoints.map(w => w.rallyingPoint)} />}
        {!!markerFeatures && <PingsMarkersLayer features={markerFeatures!} />}
        {!!record && !!markerFeatures && (
          <FitFeatures features={[...markerFeatures.features, ...record.wayPoints.map(w => asPoint(w.rallyingPoint.location))]} />
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

function PingsMarkersLayer({ features }: { features: FeatureCollection<GeoJSON.Point, any> }) {
  const map = useMapContext();
  const [displayPopup, setDisplayPopup] = useState<{ lng: number; lat: number; properties: any } | null>();

  useEvent(HighlightPingMarkerEventName, (e: HighlightPingMarkerEvent) => {
    map.current?.setFeatureState({ source: "pings", id: e.id }, { hover: e.highlight });
  });
  useEvent(CenterPingMarkerEventName, (e: CenterPingMarkerEvent) => {
    const f = features.features.find(f => f.id === e.id)!;
    map.current?.flyTo({ center: [f.geometry.coordinates[0], f.geometry.coordinates[1]], animate: true });
  });

  const mapFeatures = useMemo(() => {
    return (
      <>
        <GeojsonSource id={"pings"} data={features} />
        <MarkersLayer
          id={"pings"}
          source={"pings"}
          onClickPoint={e => {
            if (!e.features || e.features.length === 0 || !map.current) return;
            const coords = (e.features![0].geometry as GeoJSON.Point).coordinates;
            const point = map.current.project({ lng: coords[0], lat: coords[1] });
            console.log("EEE", e.lngLat, coords, e.point, point, e.features);
            setDisplayPopup({ ...e.lngLat, properties: { ...e.features[0].properties, coordinates: coords } });
          }}
          onMouseEnterPoint={f => {
            // Log more details in console
            console.log("PING", { ...f.properties, geometry: f.geometry });
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
              "icon-size": 1.2
            },
            paint: {
              "icon-color": ["get", "color"],
              "icon-halo-color": "#0F172A",
              "icon-halo-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 0.6]
            }
          }}
        />
      </>
    );
  }, [map, features]);
  return (
    <>
      {mapFeatures}
      {displayPopup && (
        <Popup lngLat={displayPopup}>
          <div className="overflow-x-scroll">
            <table className="py-4">
              <tbody>
                {Object.entries(displayPopup.properties).map(([k, v]) => (
                  <tr key={k}>
                    <td className="whitespace-nowrap font-medium px-2">{k}</td>
                    <td>{JSON.stringify(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Popup>
      )}
    </>
  );
}
