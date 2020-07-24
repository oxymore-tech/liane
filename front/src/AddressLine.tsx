import React from "react";
import {Address} from "./api/address";

function show(...params: Array<string | undefined>) {
    const filter = params.filter(p => p);
    return `${filter.join(" ")}${filter.length > 0 ? ", " : ""}`;
}

export function showAddress(a: Address) {
    if (a.addressDetails) {
        return <span>
            {
                show(a.addressDetails.houseNumber, a.addressDetails.road)
                + show(a.addressDetails.isolatedDwelling)
            }
            <span style={{fontWeight: "bold"}}>
                {a.addressDetails.village || a.addressDetails.town || a.addressDetails.city || a.addressDetails.municipality}        
            </span>
        </span>;


    } else {
        return <span> {a.displayName} </span>;
    }
}
