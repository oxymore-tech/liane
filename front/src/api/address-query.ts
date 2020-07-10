import {LatLngLiteral} from "leaflet";

export class AddressNameQuery {
    readonly coord:LatLngLiteral;
    
}

export class AddressLatLngQuery {
    readonly address:string;
}