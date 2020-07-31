import { LatLngLiteral } from "leaflet";

export interface Address {
  readonly coordinate: LatLngLiteral;
  readonly displayName: string;
  readonly addressDetails?: AddressDetails;
}

interface AddressDetails {
  readonly houseNumber?: string;
  readonly hamlet?: string;
  readonly road?: string;
  readonly town?: string;
  readonly isolatedDwelling?: string;
  readonly village?: string;
  readonly municipality?: string;
  readonly city?: string;
  readonly county?: string;
  readonly state?: string;
  readonly country?: string;
  readonly countryCode: string;
}

