import { AddressLatLngQuery, AddressNameQuery } from "./address-query";
import { Address } from "./address";

class AddressService {

    async GetAddressName(query: AddressNameQuery): Promise<Address> {
        const response = await fetch("http://localhost:8081/api/address_name", {
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(query)
        });
        return await response.json();
    }
    async GetAddressCoord(query: AddressLatLngQuery): Promise<Address> {
        const response = await fetch("http://localhost:8081/api/address_coord", {
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(query)
        });
        return await response.json();
    }

}


export const addressService = new AddressService();