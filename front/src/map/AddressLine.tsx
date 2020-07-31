import React from "react";
import { Address } from "api/address";

function show(...params: Array<string | undefined>) {
  const filter = params.filter(p => p);
  return `${filter.join(" ")}${filter.length > 0 ? ", " : ""}`;
}

export function formatAddress(a: Address) {
  if (a.addressDetails) {
    return show(a.addressDetails.houseNumber, a.addressDetails.road)
      + show(a.addressDetails.isolatedDwelling || a.addressDetails.hamlet) +
      (a.addressDetails.village || a.addressDetails.town || a.addressDetails.city || a.addressDetails.municipality);
  } else {
    return a.displayName;
  }
}

export function AddressLine({address}: { address: Address }) {
  if (address.addressDetails) {
    return <span>
            {
              show(address.addressDetails.houseNumber, address.addressDetails.road)
              + show(address.addressDetails.isolatedDwelling || address.addressDetails.hamlet)
            }
      <span style={{fontWeight: "bold"}}>
                {address.addressDetails.village || address.addressDetails.town || address.addressDetails.city || address.addressDetails.municipality}        
            </span>
        </span>;


  } else {
    return <span> {address.displayName} </span>;
  }
}