import { FeatureCollection, MultiLineString, Point } from "geojson";
import { AppEnv, RallyingPoint, Ref } from "../../../../src";
import vt2geojson from "@mapbox/vt2geojson";
import { TestEnv } from "../../setup/environment";

type LianeLayer = "rallying_point_display" | "liane_display";
type LayerGeometry<KLayer extends LianeLayer> = KLayer extends "rallying_point_display" ? Point : MultiLineString;
type LayerFeatureProperties<KLayer extends LianeLayer> = KLayer extends "rallying_point_display" ? RallyingPoint : any;
export const readLianeTile = <KLayer extends LianeLayer>(
  z: number,
  x: number,
  y: number,
  sourceLayer: KLayer,
  date?: Date
): Promise<FeatureCollection<LayerGeometry<KLayer>, LayerFeatureProperties<KLayer>>> =>
  new Promise((resolve, reject) => {
    const params = "?" + AppEnv.getLayerDateParams(date ?? new Date());
    vt2geojson(
      {
        uri: `${TestEnv.TILES_ULR}/liane_display/${z}/${x}/${y}${params}`,
        layer: sourceLayer
      },
      (err: any, result: FeatureCollection<LayerGeometry<KLayer>, LayerFeatureProperties<KLayer>>) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });

export const readLianeFilteredTile = <KLayer extends LianeLayer>(
  z: number,
  x: number,
  y: number,
  sourceLayer: KLayer,
  point: Ref<RallyingPoint>,
  type: "pickup" | "deposit",
  date?: Date
): Promise<FeatureCollection<LayerGeometry<KLayer>, LayerFeatureProperties<KLayer>>> =>
  new Promise((resolve, reject) => {
    const params = "?" + AppEnv.getLayerDateParams(date ?? new Date()) + `&${type}=${point}`;
    vt2geojson(
      {
        uri: `${TestEnv.TILES_ULR}/liane_display_filter_test/${z}/${x}/${y}${params}`,
        layer: sourceLayer
      },
      (err: any, result: FeatureCollection<LayerGeometry<KLayer>, LayerFeatureProperties<KLayer>>) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });
