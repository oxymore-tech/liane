import { Address } from "api/address";
import { LatLngLiteral } from "leaflet";
import { BaseUrl } from "./url";

class AddressService {

  async GetDisplayName(coordinate: LatLngLiteral): Promise<Address> {
    const url = new URL(`${BaseUrl}/api/address/displayName`);
    url.searchParams.append("lat", coordinate.lat.toString());
    url.searchParams.append("lng", coordinate.lng.toString());

    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json"
      },
      method: "GET"
    });
    return await response.json();
  }

  async GetCoordinate(displayName: string): Promise<Address> {
    const url = new URL(`${BaseUrl}/api/address/coordinate`);
    url.searchParams.append("displayName", displayName);

    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json"
      },
      method: "GET"
    });
    return await response.json();
  }

  async Search(displayName: string): Promise<Address[]> {
    const url = new URL(`${BaseUrl}/api/address/search`);
    url.searchParams.append("displayName", displayName);

    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json"
      },
      method: "GET"
    });
    return await response.json();
  }

}


export const addressService = new AddressService();