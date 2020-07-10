import {LatLngLiteral} from "leaflet";

export interface Address {
    readonly coord:LatLngLiteral;
    readonly address:string;
}