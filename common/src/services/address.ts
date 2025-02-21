import { LatLng } from "../api";
import { HttpClient } from "./http";

export type Address = {
  street: string;
  zipCode: string;
  city: string;
  county: string;
  state: string;
  country: string;
  countryCode: string;
};

export type AddressResponse = {
  displayName: string;
  coordinate: LatLng;
  address: Address;
};

export interface AddressService {
  getAddress(position: LatLng): Promise<AddressResponse>;
}

export class AddressServiceClient implements AddressService {
  constructor(protected http: HttpClient) {}

  async getAddress(position: LatLng): Promise<AddressResponse> {
    return await this.http.get<AddressResponse>("/address/displayName", { params: position });
  }
}
