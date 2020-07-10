import {LatLngLiteral} from "leaflet";

export interface Address {
    readonly coordinate: LatLngLiteral;
    readonly displayName: string;
}