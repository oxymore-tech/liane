"use client";
import { departements } from "@/api/osm";
import { notFound, useParams } from "next/navigation";
import { useAppServices } from "@/components/ContextProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GeojsonSource } from "@/components/map/GeojsonSource";
import { EmptyFeatureCollection, RallyingPoint, Ref, toLatLng } from "@liane/common";
import React, { useMemo, useRef, useState } from "react";
import { Feature, FeatureCollection, Point } from "geojson";
import { LineLayer } from "@/components/map/layers/base/LineLayer";
import Map from "@/components/map/Map";
import maplibregl, { FillLayerSpecification, LineLayerSpecification } from "maplibre-gl";
import { LoadingViewIndicator } from "@/components/base/LoadingViewIndicator";
import { FitFeatures } from "@/components/map/FitFeatures";
import { Breadcrumb, Card, Checkbox, Toast } from "flowbite-react";
import centroid from "@turf/centroid";
import { LayerConfig } from "@/components/map/layers/base/abstractLayer";
import { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { Marker } from "@/components/map/Marker";
import { SplitView } from "@/components/base/SplitView";
import { IconButton } from "@/components/base/IconButton";
import { FormProvider, useController, useForm, useFormContext } from "react-hook-form";
import { MarkerSymbolLayer, SymbolLayer } from "@/components/map/layers/base/SymbolLayer";
import { FillLayer } from "@/components/map/layers/base/FillLayer";
import { RallyingPointEdition, RequestView } from "@/app/dashboard/rallying-points/[...slug]/RallyingPointEdition";
import { getDepartmentBoundaryQuery, useDepartmentData } from "@/app/dashboard/rallying-points/[...slug]/DepartmentDataStore";
import { RallyingPointFullRequest } from "@/api/api";
import { AreaSelectionControl } from "@/components/map/AreaSelection";
import { ControlPanel, ControlPanelButton, ControlPanelToggle } from "@/components/map/ControlPanel";
import { Icon } from "@/components/base/Icon";
import { RallyingPointImportModal } from "@/app/dashboard/rallying-points/[...slug]/RallyingPointImportModal";

export default function RallyingPointsAdminPage() {
  const { slug } = useParams();
  const dpt = slug[0];

  const { osm } = useAppServices();
  const { data, isLoading } = useQuery(getDepartmentBoundaryQuery(dpt, osm));
  const isDepartmentDataNotFound = !!data && data.features.length === 0;

  let view;
  if (isDepartmentDataNotFound) view = notFound();
  else if (isLoading) view = <LoadingViewIndicator />;
  else view = <DepartmentLoadingView department={dpt} />;
  return (
    <div className="h-full flex-col flex w-full">
      <Breadcrumb className="py-4 px-4">
        <Breadcrumb.Item href="/dashboard/rallying-points/">Gestion par département</Breadcrumb.Item>
        <Breadcrumb.Item>{departements[dpt]}</Breadcrumb.Item>
      </Breadcrumb>
      <div className="grow w-full relative">{view}</div>
    </div>
  );
}

const DepartmentLoadingView = ({ department }: { department: string }) => {
  const { isLoading, boundary, error, reachable, requests, points, parkings } = useDepartmentData(department);
  if (isLoading) return <LoadingViewIndicator />;
  if (error) return <div>{error.message}</div>;
  return <DepartmentView department={department} data={{ points, requests, parkings, reachable }} boundaries={boundary!} />;
};

const DepartmentView = ({
  department,
  boundaries,
  data
}: {
  department: string;
  data: { points?: FeatureCollection; requests?: FeatureCollection; parkings?: FeatureCollection; reachable?: FeatureCollection };
  boundaries: FeatureCollection;
}) => {
  const map = useRef<maplibregl.Map>(null);
  const queryClient = useQueryClient();
  const center = useMemo(() => {
    const c = centroid(boundaries);
    return toLatLng(c.geometry.coordinates);
  }, [boundaries]);
  const [newRallyingPoint, setNewRallyingPoint] = useState<null | Partial<RallyingPoint>>();
  const [selectedRallyingPoint, setSelectedRallyingPoint] = useState<null | Ref<RallyingPoint>>();
  const [selectedRequest, setSelectedRequest] = useState<null | Ref<RallyingPointFullRequest>>();

  const methods = useForm<{ active_rp: boolean; inactive_rp: boolean; requested_rp: boolean; parking_suggestions: boolean }>({
    mode: "onChange",
    defaultValues: { active_rp: true }
  });

  const selectedRallyingPointFeature = useMemo<Feature<Point, Omit<RallyingPoint, "location">> | null>(() => {
    if (selectedRallyingPoint) {
      return data.points?.features.find(p => p.properties!.id === selectedRallyingPoint) ?? null;
    }
    return null;
  }, [data, selectedRallyingPoint]);

  const selectedRequestFeature = useMemo<Feature<Point, RallyingPointFullRequest> | null>(() => {
    if (selectedRequest) {
      return data.requests?.features.find(p => p.properties!.id === selectedRequest) ?? null;
    }
    return null;
  }, [data, selectedRequest]);

  const showBottomPane = !!newRallyingPoint || !!selectedRallyingPointFeature || !!selectedRequest;

  const [selectingLocation, setSelectingLocation] = useState(false);
  const [importingPoints, setImportingPoints] = useState(false);

  return (
    <SplitView initial={200}>
      <FormProvider {...methods}>
        <Map
          ref={map}
          center={newRallyingPoint?.location ?? center}
          onClick={e => {
            if (selectingLocation) {
              console.log(e.lngLat);
              setNewRallyingPoint({ location: e.lngLat });
              setSelectingLocation(false);
            }
          }}>
          <ControlPanel>
            <AreaSelectionControl targetLayers={[]} onSelectFeatures={() => {}} onHoverFeatureStateChanged={() => {}} />
            <ControlPanelButton
              label="Importer des points"
              onClick={() => {
                setImportingPoints(true);
              }}>
              <Icon name="import" size="20px" color="#000" />
            </ControlPanelButton>
            <ControlPanelToggle label="Nouveau point" active={selectingLocation || !!newRallyingPoint} setActive={setSelectingLocation}>
              <Icon name="add" size="20px" color="#000" />
            </ControlPanelToggle>
          </ControlPanel>

          {!!boundaries && !newRallyingPoint && (
            <FitFeatures features={boundaries.features.concat(data?.requests?.features ?? [])} setMaxBounds={true} />
          )}

          <Sources {...data} />
          <GeojsonSource id={"department_boundary"} data={boundaries ?? EmptyFeatureCollection} />

          <LineLayer
            id={"department_boundary"}
            source={"department_boundary"}
            beforeId={"Water"}
            // beforeId={"River labels"}
            props={BoundaryLayerProps}
          />

          <FillLayer id={"reachable_area"} source={"areas"} beforeId={"Water"} props={AreaLayerProps} />
          <SymbolLayer
            id={"parking_suggestions"}
            source={"parking_suggestions"}
            onClick={e => console.log(e.features![0].properties)}
            props={ParkingSuggestionLayerProps}
          />
          <MarkerSymbolLayer
            id={"rallying_points"}
            source={"rallying_points"}
            props={RPLayerProps}
            onClick={e => {
              if (e.features && e.features.length > 0) {
                if (selectedRequest) {
                  map.current?.setFeatureState({ source: "rallying_points_requests", id: selectedRequest }, { selected: false });
                  setSelectedRequest(null);
                }
                if (selectedRallyingPoint)
                  map.current?.setFeatureState({ source: "rallying_points", id: selectedRallyingPoint }, { selected: false });
                setSelectedRallyingPoint(e.features[0].properties.id!);
                map.current?.setFeatureState({ source: "rallying_points", id: e.features[0].properties.id! }, { selected: true });
              }
            }}
          />
          <MarkerSymbolLayer
            id={"rallying_points_requests"}
            source={"rallying_points_requests"}
            props={RPRequestLayerProps}
            onClick={e => {
              if (e.features && e.features.length > 0) {
                if (selectedRallyingPoint) {
                  map.current?.setFeatureState({ source: "rallying_points", id: selectedRallyingPoint }, { selected: false });
                  setSelectedRallyingPoint(null);
                }
                if (selectedRequest) map.current?.setFeatureState({ source: "rallying_points_requests", id: selectedRequest }, { selected: false });
                setSelectedRequest(e.features[0].properties.id!);
                map.current?.setFeatureState({ source: "rallying_points_requests", id: e.features[0].properties.id! }, { selected: true });
              }
            }}
          />
          {newRallyingPoint && <Marker lngLat={newRallyingPoint.location!} />}
          {/*selectedLocation && (
            <PopupContainer lngLat={selectedLocation} anchor={"top"}>
              <Card>
                <Button>Choisir cette localisation</Button>
              </Card>
            </PopupContainer>
          )*/}
        </Map>

        <div className="absolute z-[5] w-full bottom-0 top-0 pointer-events-none">
          {selectingLocation && (
            <div className="absolute z-[5] top-4 w-full">
              <Toast className="mx-auto pointer-events-auto">
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-500 dark:bg-cyan-800 dark:text-cyan-200">
                  <Icon name="pin" className="h-5 w-5" />
                </div>
                <div className="ml-3 text-sm font-normal">Cliquez sur la carte pour choisir un emplacement</div>
                <Toast.Toggle
                  onClick={() => {
                    setSelectingLocation(false);
                  }}
                />
              </Toast>
            </div>
          )}
          {!selectingLocation && !newRallyingPoint && <LegendView />}
          <RallyingPointImportModal importingPoints={importingPoints} onClose={() => setImportingPoints(false)} />
        </div>
      </FormProvider>
      {showBottomPane && (
        <div className=" p-1.5 grow grid bg-white dark:bg-gray-900" style={{ gridTemplateRows: "auto minmax(0, 1fr) auto" }}>
          <div className="flex gap-4 justify-start items-center mx-1 mb-4">
            <IconButton
              icon="close"
              onClick={() => {
                if (selectedRallyingPoint)
                  map.current?.setFeatureState({ source: "rallying_points", id: selectedRallyingPoint }, { selected: false });
                if (selectedRequest) map.current?.setFeatureState({ source: "rallying_points_requests", id: selectedRequest }, { selected: false });
                setSelectedRallyingPoint(null);
                setNewRallyingPoint(null);
                setSelectedRequest(null);
              }}
            />
            <h3 className="font-bold">
              {newRallyingPoint && "Nouveau point de ralliement"}
              {selectedRallyingPointFeature && selectedRallyingPointFeature.properties.label}
              {selectedRequest && "Propostion de point"}
            </h3>
          </div>
          <div className="overflow-y-auto flex flex-col">
            {newRallyingPoint && (
              <RallyingPointEdition
                refresh={() => queryClient.invalidateQueries({ queryKey: ["rallying_point", department] })}
                point={{ ...newRallyingPoint }}
              />
            )}
            {selectedRallyingPointFeature && (
              <RallyingPointEdition
                refresh={() => queryClient.invalidateQueries({ queryKey: ["rallying_point", department] })}
                point={{ ...selectedRallyingPointFeature.properties, location: toLatLng(selectedRallyingPointFeature.geometry.coordinates) }}
              />
            )}
            {selectedRequestFeature && (
              <RequestView
                refresh={() => queryClient.invalidateQueries({ queryKey: ["rallying_point", department] })}
                //  refresh={() => queryClient.invalidateQueries({ queryKey: ["rallying_point", department] })}
                request={selectedRequestFeature.properties}
              />
            )}
          </div>
        </div>
      )}
    </SplitView>
  );
};

const Sources = (props: {
  points?: FeatureCollection;
  requests?: FeatureCollection;
  parkings?: FeatureCollection;
  reachable?: FeatureCollection;
}) => {
  const { watch } = useFormContext();
  const values = watch();

  return (
    <>
      <GeojsonSource id={"areas"} data={values.parking_suggestions && !!props.reachable ? props.reachable : EmptyFeatureCollection} />
      <GeojsonSource id={"parking_suggestions"} data={values.parking_suggestions && !!props.parkings ? props.parkings : EmptyFeatureCollection} />
      <GeojsonSource
        id={"rallying_points"}
        promoteId={"id"}
        data={
          (values.active_rp || values.inactive_rp) && !!props.points
            ? {
                ...props.points,
                features: props.points.features.filter(
                  f => (values.active_rp && f.properties!.isActive) || (values.inactive_rp && !f.properties!.isActive)
                )
              }
            : EmptyFeatureCollection
        }
      />
      <GeojsonSource
        id={"rallying_points_requests"}
        promoteId={"id"}
        data={values.requested_rp && !!props.requests ? props.requests : EmptyFeatureCollection}
      />
    </>
  );
};
const BoundaryLayerProps: LayerConfig<LineLayerSpecification>["props"] = {
  paint: {
    "line-color": "rgb(255,56,0)",
    "line-width": 4
  }
};
const RPLayerProps: LayerConfig<SymbolLayerSpecification>["props"] = {
  //   minzoom: 8
  layout: {
    "icon-image": "pin",
    "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 9, 0.5, 11, 0.7],
    "icon-allow-overlap": true,
    "icon-optional": false,
    "icon-anchor": "bottom",
    "text-field": ["step", ["zoom"], "", 11, ["get", "label"]],
    "text-allow-overlap": false,
    "text-anchor": "bottom",
    "text-offset": [0, -3.4],
    "text-max-width": 5.4,
    "text-size": 12,
    "text-optional": true
  },
  paint: {
    "text-halo-width": 1.5,
    "text-color": ["case", ["boolean", ["feature-state", "selected"], false], "#073852", "#52070c"],
    "text-halo-color": "#fff",
    "icon-color": ["case", ["boolean", ["feature-state", "selected"], false], "#0094ff", ["case", ["get", "isActive"], "#e35374", "#86717a"]],
    "icon-halo-color": "#000",
    "icon-halo-width": 0.6
  }
};

const RPRequestLayerProps: LayerConfig<SymbolLayerSpecification>["props"] = {
  //   minzoom: 8
  layout: {
    "icon-image": "pin",
    "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 9, 0.5, 11, 0.7],
    "icon-allow-overlap": true,
    "icon-optional": false,
    "icon-anchor": "bottom",
    "text-optional": true
  },
  paint: {
    "icon-color": ["case", ["boolean", ["feature-state", "selected"], false], "#0094ff", "#30be67"],
    "icon-halo-color": "#000",
    "icon-halo-width": 0.6
  }
};

const ParkingSuggestionLayerProps: LayerConfig<SymbolLayerSpecification>["props"] = {
  minzoom: 10,
  layout: {
    "text-field": "P",
    "text-size": ["interpolate", ["linear"], ["get", "computed:area"], 0, 8, 500, 12, 1000, 16, 2500, 18],
    "text-optional": false,
    "text-allow-overlap": true
  },
  paint: {
    "text-color": ["coalesce", ["get", "color"], "#000"]
  }
};

const AreaLayerProps: LayerConfig<FillLayerSpecification>["props"] = {
  layout: {},
  paint: {
    "fill-outline-color": "transparent",
    "fill-color": [
      "case",
      ["==", ["get", "type"], "reachable"],
      "rgba(0,255,121,0.3)",
      ["==", ["get", "type"], "suggestion"],
      "rgba(44,44,44,0.3)",
      "transparent"
    ]
  }
};
const ItemLegend = ({ name, label }: { name: string; label: string }) => {
  const { field } = useController({ name });

  return (
    <div className="gap-2 flex items-center">
      <Checkbox checked={field.value || false} onChange={field.onChange} />
      <span>{label}</span>
    </div>
  );
};
const LegendView = () => {
  return (
    <div className="px-4 py-2 absolute z-[5] bottom-0 pointer-events-auto ">
      <Card>
        <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Filtres</h5>
        <div className="gap-4 flex items-center">
          <ItemLegend name="active_rp" label="Points actifs" />
          <ItemLegend name="inactive_rp" label="Points inactifs" />
        </div>
        <ItemLegend name="requested_rp" label="Requêtes" />
        <div className="flex flex-row">
          <ItemLegend name="parking_suggestions" label="Parkings :" />
          <div className="px-4 flex flex-row ">
            <div className="px-1 flex flex-row items-center">
              <span className="p-2 mx-1 bg-[#00FF79] rounded" />
              <span className="text-sm">Zone couverte par Liane</span>
            </div>
            <div className="px-1 flex flex-row items-center">
              <span className="p-2 mx-1 bg-[#000] rounded" />
              <span className="text-sm">Zone potentielle</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
