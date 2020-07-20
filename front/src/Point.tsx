import {LatLngLiteral} from "leaflet";
import React, {ChangeEvent, InputHTMLAttributes, useEffect, useState} from "react";
import VirtualizedSelect from "react-virtualized-select";
import {Address} from "./api/address";
import {addressService} from "./api/address-service";

export interface Point {
    readonly coordinate: LatLngLiteral;
    readonly address: string;
    readonly exclude: boolean;
}

export interface PointComponentProps {
    index: number,
    point: Point,
    optional: boolean,
    onChange: (i: number, p: Point) => void
    onSelect: (i: number) => void
    onInput: (a: string) => void
}

export function PointComponent({index, point, optional, onChange, onSelect, onInput}: PointComponentProps) {

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [input, setInput] = useState("");

    const [selectedAddress, setSelectedAddress] = useState<Address>({
        displayName: point.address,
        coordinate: point.coordinate
    });

    useEffect(() => {
        if (input) {
            addressService.Search(input)
                .then(a => setAddresses(a));
        } else {
            setAddresses([]);
        }
    }, [input])

    function excludeClick() {
        onChange(index, {...point, exclude: !point.exclude});
    }

    function selectClick() {
        onSelect(index);
    }

    function inputChange(event: ChangeEvent<HTMLInputElement>) {
        // TODO: debounce, filtre les events et merge en seul, checker librairies eg. lodash

        onInput(event.target.value);
    }

    useEffect(() => {
        onChange(index, {...point, coordinate: selectedAddress.coordinate, address: selectedAddress.displayName})
    }, [selectedAddress]);

    return <>

        {
            optional ? <button onClick={excludeClick}> {point.exclude} </button> : null
//                <input type="text" value={point.address} onClick={selectClick} onChange={inputChange}/>

        }

        <VirtualizedSelect

            backspaceRemoves={false}

            labelKey='displayName'

            options={addresses}

            onInputChange={input => {
                setInput(input);
                return input;
            }}

            onValueClick={selectClick}
            value={selectedAddress}

            onChange={option => {
                if (option) {
                    setSelectedAddress((option.valueOf() as Address));
                }
            }}


        />

    </>;
}