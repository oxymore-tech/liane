import {LatLngLiteral} from "leaflet";

export interface Address {
    readonly coordinate: LatLngLiteral;
    readonly displayName: string;
    readonly addressDetails?:AddressDetails;
}
interface AddressDetails {
    readonly houseNumber: string;
    readonly road:string;
    readonly town:string;
    readonly city:string;
    readonly county:string;
    readonly state:string;
    readonly country:string;
    readonly countryCode:string;
}
/*
boundingbox - area of corner coordinates
string houseNumber, 
string road, 
string town, 
string city, 
string county, 
string stateDistrict,
string state, 
string postcode, 
string country, 
string countryCode
 */