"use client";
import { departements } from "@/api/osm";
import { notFound, useParams } from "next/navigation";
import { useAppServices } from "@/components/ContextProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyFeatureCollection, RallyingPoint, toLatLng } from "@liane/common";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Feature, FeatureCollection, Point } from "geojson";
import { LoadingViewIndicator } from "@/components/base/LoadingViewIndicator";
import { Breadcrumb, Card, Checkbox, Toast } from "flowbite-react";
import centroid from "@turf/centroid";
import { Marker } from "@/components/map/Marker";
import { IconButton } from "@/components/base/IconButton";
import { FormProvider, useController, useForm } from "react-hook-form";
import { getDepartmentBoundaryQuery, useDepartmentData } from "@/app/dashboard/rallying_point/[...slug]/DepartmentDataStore";
import { RallyingPointFullRequest } from "@/api/api";
import { ControlPanelButton } from "@/components/map/ControlPanel";
import { Icon } from "@/components/base/Icon";
import { RallyingPointImportModal } from "@/app/dashboard/rallying_point/[...slug]/RallyingPointImportModal";
import { Layer, Source } from "react-map-gl/maplibre";
import { AppMapSources, AppMapView } from "@/components/map/AppMapView";
import { RallyingPointLayer } from "@/components/map/layers/RallyingPointLayer";
import { RallyingPointRequestLayer } from "@/components/map/layers/RallyingPointRequestLayer";
import { ParkingLayer } from "@/components/map/layers/ParkingLayer";
import { AreaLayer } from "@/components/map/layers/AreaLayer";
import { CurrentEditPoint, RallyingPointEdition } from "@/app/dashboard/rallying_point/[...slug]/RallyingPointEdition";
import { LatLng } from "@liane/common/src";

export default function RallyingPointsAdminPage() {
  const { slug } = useParams();
  const dpt = slug ? slug[0] : "48";

  const { osm } = useAppServices();
  const { data, isLoading } = useQuery(getDepartmentBoundaryQuery(dpt, osm));
  const isDepartmentDataNotFound = !!data && data.features.length === 0;

  let view;
  if (isDepartmentDataNotFound) view = notFound();
  else if (isLoading) view = <LoadingViewIndicator />;
  else view = <DepartmentLoadingView department={dpt} />;
  return (
    <div className="h-full flex-col flex w-full">
      <Breadcrumb className="text-gray-200 py-4 px-4 z-5">
        <Breadcrumb.Item href="/dashboard/rallying_point/">Gestion par département</Breadcrumb.Item>
        <Breadcrumb.Item>{departements[dpt]}</Breadcrumb.Item>
      </Breadcrumb>
      <div className="grow w-full relative">{view}</div>
    </div>
  );
}

type CurrentSelection =
  | { type: "point"; id: string; feature: Feature<Point, Omit<RallyingPoint, "location">> }
  | { type: "request"; id: string; feature: Feature<Point, RallyingPointFullRequest> };

const DepartmentLoadingView = ({ department }: { department: string }) => {
  const { isLoading, boundary, error, reachable, requests, points, parkings } = useDepartmentData(department);
  if (isLoading) return <LoadingViewIndicator />;
  if (error) return <div>{error.message}</div>;
  //@ts-ignore
  return <DepartmentView department={department} data={{ points, requests, parkings, reachable }} boundaries={boundary!} />;
};

type DepartmentViewProps = { department: string; data: AppMapSources; boundaries: FeatureCollection };

const DepartmentView = ({ department, boundaries, data }: DepartmentViewProps) => {
  const queryClient = useQueryClient();
  const center = useMemo(() => {
    const c = centroid(boundaries);
    return toLatLng(c.geometry.coordinates);
  }, [boundaries]);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [newRallyingPoint, setNewRallyingPoint] = useState<Partial<RallyingPoint>>();

  const [currentSelection, setCurrentSelection] = useState<CurrentSelection>();

  const methods = useForm<{ active_rp: boolean; inactive_rp: boolean; requested_rp: boolean; parking_suggestions: boolean }>({
    mode: "onChange",
    defaultValues: { active_rp: true, requested_rp: true, inactive_rp: true, parking_suggestions: false }
  });

  useEffect(() => {
    if (selectedFeatures.length === 0) {
      setCurrentSelection(undefined);
      return;
    }
    const id = selectedFeatures[0];
    const selectedPoint = data.points?.features.find(p => p.properties!.id === id);
    if (selectedPoint) {
      setCurrentSelection({ type: "point", id, feature: selectedPoint as Feature<Point, Omit<RallyingPoint, "location">> });
      return;
    }
    const selectedRequest = data.requests?.features.find(p => p.properties!.id === id);
    if (selectedRequest) {
      setCurrentSelection({ type: "request", id, feature: selectedRequest as Feature<Point, RallyingPointFullRequest> });
      return;
    }
  }, [data, selectedFeatures]);

  const showBottomPane = !!newRallyingPoint || !!currentSelection;

  const [importingPoints, setImportingPoints] = useState(false);
  const [pickLocation, setPickLocation] = useState(false);
  const [temporaryMarker, setTemporaryMarker] = useState<LatLng>();

  const watch = methods.watch();

  const parkings = useMemo(() => {
    return watch.parking_suggestions && !!data.parkings ? data.parkings : EmptyFeatureCollection;
  }, [data.parkings, watch.parking_suggestions]);

  const reachable = useMemo(() => {
    return watch.parking_suggestions && !!data.reachable ? data.reachable : EmptyFeatureCollection;
  }, [data.reachable, watch.parking_suggestions]);

  const points = useMemo(() => {
    return (watch.active_rp || watch.inactive_rp) && !!data.points
      ? {
          ...data.points,
          features: data.points.features.filter(f => (watch.active_rp && f.properties!.isActive) || (watch.inactive_rp && !f.properties!.isActive))
        }
      : EmptyFeatureCollection;
  }, [watch.active_rp, watch.inactive_rp, data.points]);

  const requests = useMemo(() => {
    return watch.requested_rp && !!data.requests ? data.requests : EmptyFeatureCollection;
  }, [watch.requested_rp, data.requests]);

  const handleCloseForm = useCallback(() => {
    setSelectedFeatures([]);
    setNewRallyingPoint(undefined);
    setTemporaryMarker(undefined);
  }, []);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["rallying_point", department] });
    await queryClient.invalidateQueries({ queryKey: ["requests", department] });
    setSelectedFeatures([]);
    setNewRallyingPoint(undefined);
    setTemporaryMarker(undefined);
  }, [department, queryClient]);

  const currentEditPoint = useMemo<CurrentEditPoint>(() => {
    if (newRallyingPoint) {
      return newRallyingPoint;
    }
    setTemporaryMarker(undefined);
    if (!currentSelection) {
      return {};
    }
    if (currentSelection.type === "point") {
      return { ...currentSelection.feature.properties, location: toLatLng(currentSelection.feature.geometry.coordinates) };
    }
    const { id, comment, createdBy, createdAt, ...point } = currentSelection.feature.properties;
    return {
      ...point,
      id,
      isActive: false,
      metadata: {
        comment,
        createdBy,
        createdAt
      }
    } as CurrentEditPoint;
  }, [newRallyingPoint, currentSelection]);

  const currentTitle = useMemo(() => {
    if (newRallyingPoint) {
      return "Nouveau point de ralliement";
    }
    if (currentSelection) {
      return currentSelection.type === "point" ? currentSelection.feature.properties.label : "Proposition de point";
    }
    return "";
  }, [currentSelection, newRallyingPoint]);

  const handlePickLocationStart = useCallback(() => {
    setPickLocation(showBottomPane);
  }, [showBottomPane]);

  const handlePickLocationEnd = useCallback((pos?: LatLng) => {
    if (!pos) {
      setPickLocation(false);
      return;
    }
    setTemporaryMarker(pos);
    setPickLocation(false);
  }, []);

  const handleNew = useCallback(() => {
    setCurrentSelection(undefined);
    setNewRallyingPoint({ isActive: false });
  }, []);

  return (
    <>
      <FormProvider {...methods}>
        <AppMapView
          center={center}
          onSelectFeatures={setSelectedFeatures}
          onPickLocationStart={handlePickLocationStart}
          onPickLocationEnd={handlePickLocationEnd}
          pickLocation={pickLocation}>
          <RallyingPointLayer features={points} selectedFeatures={selectedFeatures} pin />
          <RallyingPointRequestLayer features={requests} selectedFeatures={selectedFeatures} />
          <ParkingLayer features={parkings} />
          <AreaLayer features={reachable} />

          <Source id="department_boundary" type="geojson" data={boundaries} />
          <Layer
            id="department_boundary"
            type="line"
            source="department_boundary"
            beforeId="Water"
            paint={{
              "line-color": "rgb(255,56,0)",
              "line-width": 2
            }}
          />

          {temporaryMarker && <Marker lngLat={temporaryMarker} onChange={setTemporaryMarker} />}
        </AppMapView>

        <div className="absolute z-[100] w-full bottom-0 top-0 pointer-events-none">
          {pickLocation && (
            <div className="absolute z-[5] top-2 w-full">
              <Toast className="mx-auto pointer-events-auto">
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-500 dark:bg-cyan-800 dark:text-cyan-200">
                  <Icon name="pin" className="h-5 w-5" />
                </div>
                <div className="ml-3 text-sm font-normal">Cliquez sur la carte pour choisir un emplacement</div>
              </Toast>
            </div>
          )}
          <LegendView onImport={() => setImportingPoints(true)} onNew={handleNew} />
          <RallyingPointImportModal importingPoints={importingPoints} onClose={() => setImportingPoints(false)} />
        </div>
      </FormProvider>
      {showBottomPane && (
        <div className="px-2 py-2 absolute top-0 z-[5] w-[600px] pointer-events-auto ">
          <Card className="bg-white dark:bg-gray-800">
            <div className="grow grid" style={{ gridTemplateRows: "auto minmax(0, 1fr) auto" }}>
              <div className="flex gap-4 justify-start items-center mx-1 mb-4">
                <IconButton icon="close" onClick={handleCloseForm} />
                <h3 className="font-bold">{currentTitle}</h3>
              </div>
              <div className="overflow-y-auto flex flex-col">
                <div className="justify-between flex flex-col grow mb-8">
                  <RallyingPointEdition onSave={handleRefresh} point={currentEditPoint} position={temporaryMarker} onClose={handleCloseForm} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

type ExtraControlsProps = {
  onImport: () => void;
  onNew: () => void;
};

const ExtraControls = ({ onImport, onNew }: ExtraControlsProps) => {
  return (
    <div className="flex flex-row gap-4">
      <ControlPanelButton label="Importer des points" onClick={onImport}>
        <Icon name="import" size="20px" color="#000" />
      </ControlPanelButton>
      <ControlPanelButton label="Nouveau point" onClick={onNew}>
        <Icon name="add" size="20px" color="#000" />
      </ControlPanelButton>
    </div>
  );
};

const ItemLegend = ({ name, label }: { name: string; label: string }) => {
  const { field } = useController({ name });

  return (
    <div className="gap-2 flex items-center">
      <Checkbox checked={field.value ?? false} onChange={field.onChange} />
      <span>{label}</span>
    </div>
  );
};

const LegendView = ({ onImport, onNew }: ExtraControlsProps) => {
  return (
    <div className="absolute left-2 bottom-2 z-[100] pointer-events-auto">
      <Card>
        <h5 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">Filtres</h5>
        <div className="gap-4 flex items-center">
          <ItemLegend name="active_rp" label="Points actifs" />
          <ItemLegend name="inactive_rp" label="Points inactifs" />
          <ItemLegend name="requested_rp" label="Nouvelles demandes" />
        </div>
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
        <ExtraControls onImport={onImport} onNew={onNew} />
      </Card>
    </div>
  );
};
