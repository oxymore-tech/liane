import React, {useEffect, useState} from "react";
import {Address} from "api/address";
import {addressService} from "api/address-service";
import {debounce} from "lodash";

import {AutoComplete} from 'antd';
import {SelectProps} from 'antd/es/select';
import {showAddress} from "AddressLine";


export interface Point {
    readonly address: Address;
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

    const [input, setInput] = useState("");

    const [selectedAddress, setSelectedAddress] = useState<Address>({
        displayName: point.address,
        coordinate: point.address.coordinate
    });

    useEffect(() => {

            if (input) {
                addressService.Search(input)
                    .then(addresses =>
                        addresses.map(
                            a => ({
                                value: a.displayName,
                                label: showAddress(a),
                                address: a
                            })
                        ))
                    .then(options => setOptions(options));
            } else {
                setOptions([]);
            }


        },
        [input]
    )

    function excludeClick() {
        onChange(index, {...point, exclude: !point.exclude});
    }

    function selectClick() {
        onSelect(index);
    }

    useEffect(() => {
        onChange(index, {
            ...point,
            coordinate: selectedAddress.coordinate,
            address: showAddress(selectedAddress)
        })
    }, [selectedAddress]);

    const [options, setOptions] = useState<SelectProps<Address>['options']>([]);

    return <>
        <div className={"liane-point"}>
            <td>
                {optional ?
                    <input defaultChecked={!(point.exclude)} type={"checkbox"} onClick={excludeClick}/> :
                    null}
            </td>
            <td className={"liane-point-select"}>

                <AutoComplete
                    dropdownMatchSelectWidth={252}
                    showArrow={false}
                    filterOption={false}
                    style={{width: 300}}
                    options={options}

                    onSelect={
                        (value, option) => {
                            setSelectedAddress(option.address);
                        }
                    }
                    defaultValue={point.address}

                    // onClick={selectClick}

                    onSearch={debounce(input => setInput(input), 500)}
                >
                </AutoComplete>

            </td>
        </div>


    </>;
}
