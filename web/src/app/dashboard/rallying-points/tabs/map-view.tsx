import React, { useCallback, useMemo, useRef, useState } from "react";
import maplibregl, { MapGeoJSONFeature } from "maplibre-gl";
import { SplitView } from "@/components/base/SplitView";
import { Table } from "flowbite-react";
import Map from "@/components/map/Map";
import { RallyingPointsLayer } from "@/components/map/layers/RallyingPointsLayer";
import { AreaSelection } from "@/components/map/AreaSelection";
import { FitFeatures } from "@/components/map/FitFeatures";
import { IconButton } from "@/components/base/IconButton";
import { RallyingPoint } from "@liane/common";
import { Pagination } from "@/components/base/Pagination";

export const RallyingPointsMapPage = () => {
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(0);
  const [hideBottomPane, setHideBottomPane] = useState(false);

  const [selectedFeatures, setSelectedFeatures] = useState<MapGeoJSONFeature[]>([]);

  console.log("selected", selectedFeatures.length, "features", selectedFeatures);

  const totalItems = selectedFeatures.length;
  const ref = useRef<maplibregl.Map>(null);

  const onSelectFeatures = useCallback((f: MapGeoJSONFeature[], ctrlKey: boolean) => {
    setSelectedFeatures(current => (ctrlKey ? [...current, ...f] : f));
    setHideBottomPane(false);
  }, []);
  const targetLayers = useMemo(() => ["rallying_point_display"], []);
  const onHoverFeature = useCallback((f: MapGeoJSONFeature, hovered: boolean) => {
    ref.current?.setFeatureState({ source: "rallying_point_display", sourceLayer: "rallying_point_display", id: f.id }, { selected: hovered });
  }, []);

  return (
    <SplitView initial={350}>
      <Map ref={ref} key="select-rp">
        <RallyingPointsLayer
          useLianeIcon={false}
          highlightedFeatures={selectedFeatures}
          onClickPoint={(f, ctrlKey) => {
            console.log(ctrlKey, selectedFeatures.length);
            setSelectedFeatures(current => (ctrlKey ? [...current, f] : [f]));
          }}
        />
        <AreaSelection
          targetLayers={targetLayers}
          onSelectFeatures={onSelectFeatures}
          onHoverFeatureStateChanged={onHoverFeature}
          onToggleTool={setHideBottomPane}
        />
        {selectedFeatures.length > 0 && <FitFeatures features={selectedFeatures} />}
      </Map>

      {selectedFeatures.length > 0 && !hideBottomPane && (
        <div className=" p-1.5 grow grid bg-white dark:bg-gray-900" style={{ gridTemplateRows: "auto minmax(0, 1fr) auto" }}>
          <div className="flex gap-4 justify-start items-center mx-1 mb-4">
            <IconButton icon="close" onClick={() => setSelectedFeatures([])} />
            <h3 className="font-bold">{selectedFeatures.length} sélectionnés</h3>
          </div>
          <div className="overflow-y-auto">
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell>Id</Table.HeadCell>
                <Table.HeadCell>Label</Table.HeadCell>
                <Table.HeadCell>Ville</Table.HeadCell>
                <Table.HeadCell>Adresse</Table.HeadCell>
                <Table.HeadCell>Type</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {selectedFeatures.slice(currentPage * pageSize, (currentPage + 1) * pageSize)?.map(f => {
                  const properties = f.properties as RallyingPoint;
                  return (
                    <Table.Row key={properties.id!} className="bg-white dark:border-gray-700 dark:bg-gray-800 cursor-pointer">
                      <Table.Cell> {properties.id}</Table.Cell>
                      <Table.Cell>{properties.label}</Table.Cell>
                      <Table.Cell>{properties.city + (properties.zipCode ? "(" + properties.zipCode + ")" : "")}</Table.Cell>
                      <Table.Cell>{properties.address}</Table.Cell>
                      <Table.Cell>{properties.type}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </div>

          <div className="flex sm:justify-center">
            <Pagination className="w-full" page={currentPage} perPage={pageSize} total={totalItems} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}
    </SplitView>
  );
};
