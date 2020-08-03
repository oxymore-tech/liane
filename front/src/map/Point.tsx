import React, {useEffect, useState} from "react";
import {Address} from "api/address";
import {addressService} from "api/address-service";
import {debounce} from "lodash";

import {AutoComplete, Checkbox} from 'antd';
import {SelectProps} from 'antd/es/select';
import {AddressLine, formatAddress} from "map/AddressLine";

import styles from "./Point.module.css";

export interface Point {
  readonly address: Address;
  readonly exclude: boolean;
}

export interface PointComponentProps {
  className: string;
  index: number,
  point: Point,
  optional: boolean,
  onChange: (i: number, p: Point) => void
  onSelect: (i: number) => void
  onInput: (a: string) => void
}


export function PointComponent({className, index, point, optional, onChange, onSelect}: PointComponentProps) {

  const [input, setInput] = useState(formatAddress(point.address));

  const [selectedAddress, setSelectedAddress] = useState<Address>(point.address);

  useEffect(() => {

      if (input) {
        addressService.Search(input)
          .then(addresses =>
            addresses.map(
              a => ({
                value: formatAddress(a),
                label: <AddressLine address={a}/>,
                address: a
              })
            ).filter(o => o.address.addressDetails?.postcode ))
          .then(options => setOptions(options));
      } else {
        setOptions([]);
      }


    },
    [input, point]
  )
  useEffect( ()=> {
    setSelectedAddress(point.address);
  }, [point])
  
  useEffect(() => {
    onChange(index, {
      ...point,
      address: selectedAddress
    })
  }, [selectedAddress]);

  function excludeClick() {
    onChange(index, {...point, exclude: !point.exclude});
  }

  function selectClick() {
    
    onSelect(index);
  }

  const [options, setOptions] = useState<SelectProps<Address>['options']>([]);

  
  return <div className={className}>
    <div className={styles.point}>
      <AutoComplete
        dropdownMatchSelectWidth={252}
        showArrow={false}
        filterOption={false}
        options={options}
        className={styles.autocomplete}

        onSelect={
          (value, option) => {
            setSelectedAddress(option.address);
          }
        }
        defaultValue={formatAddress(selectedAddress)}
        onClick={selectClick}

        onSearch={debounce(input => setInput(input), 200)}
      />
    </div>
    {optional ?
      <Checkbox className={styles.pointSelect} onChange={excludeClick}
                checked={!point.exclude}>{point.exclude ? "Exclus" : "Inclus"}</Checkbox> :
      null}
  </div>;

}
