import * as React from "react";
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, LatLng } from "react-native-maps";
import { StyleProp, ViewStyle } from "react-native";

const colors: string[] = ["#0B79F9", "#22278A", "#FFB545", "#FF7545", "#FF5B22"];

export type MarkerProps = {
  coordinate: LatLng,
  title?: string,
  description?: string
};

export type RouteProps = {
  coordinates: LatLng[],

};

export type MapProps = {
  center: LatLng,
  markers?: MarkerProps[],
  routes?: RouteProps[],
  style?: StyleProp<ViewStyle>,
  rotateEnabled?: boolean,
  scrollEnabled?: boolean,
};

function getRandomColor(): string {
  return colors[Math.floor(Math.random() * colors.length)];
}

const Map = ({ markers, routes, style, center, rotateEnabled, scrollEnabled }: MapProps) => (
  <MapView
    style={style}
    rotateEnabled={rotateEnabled === undefined ? true : rotateEnabled}
    scrollEnabled={scrollEnabled === undefined ? true : scrollEnabled}
    provider={PROVIDER_GOOGLE}
    region={{
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2
    }}
    initialRegion={{
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421
    }}
  >
    {markers && markers.map((p, i) => (
      <Marker key={i} coordinate={p.coordinate} />
    ))}
    {routes && routes.map((p, i) => (
      <Polyline key={i} coordinates={p.coordinates} strokeWidth={2} strokeColor={getRandomColor()} />
    ))}
    {/* TODO : voir les authorisation de connexion à internet pour pouvoir utiliser les tiles externes (normalement devrait marcher mais non) */}
    {/* <UrlTile */}
    {/*  urlTemplate="https://c.tile.openstreetmap.org/{z}/{x}/{y}.png" */}
    {/*  zIndex={-1} */}
    {/* /> */}
  </MapView>
);

export default Map;
