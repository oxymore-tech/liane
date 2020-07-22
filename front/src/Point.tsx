import {LatLngLiteral} from "leaflet";
import React, {useEffect, useState} from "react";
import VirtualizedSelect from "react-virtualized-select";
import {Address, showAddress} from "./api/address";
import {addressService} from "./api/address-service";
import {debounce} from "lodash";

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

    useEffect(() => {
        onChange(index, {...point, coordinate: selectedAddress.coordinate, address: showAddress(selectedAddress)})
    }, [selectedAddress]);

    return <>
        <div className={"liane-point"}>
            <td>
                {optional ? <input defaultChecked={!(point.exclude)} type={"checkbox"} onClick={excludeClick}/> :
                    null}
            </td>
            <td className={"liane-point-select"}>
                <VirtualizedSelect

                    backspaceRemoves={false}

                    labelKey='displayName'

                    options={addresses}

                    onInputChange={debounce(input => {
                        setInput(input);
                        return input;
                    }, 1200)}

                    onValueClick={selectClick}
                    value={selectedAddress}

                    onChange={option => {
                        if (option) {
                            setSelectedAddress((option.valueOf() as Address));
                        }
                    }}


                />
            </td>
        </div>


    </>;
}

//optionRenderer={(optionRender: VirtualizedOptionRenderOptions<Address>) => (<div> {optionRender.option.displayName}</div>)}
