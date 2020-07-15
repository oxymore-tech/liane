import {LatLngLiteral} from "leaflet";
import React, {ChangeEvent, InputHTMLAttributes, useState} from "react";

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

    function excludeClick() {
        onChange(index, {...point, exclude: !point.exclude});
    }

    function selectClick() {
        onSelect(index);
    }

    function inputChange(event: InputEvent) {
        const a = event.data ||"toulouse";
        
        onInput(a);
    }

    return <>
        
        <input type="text" value={point.address} onClick={selectClick} onChange={inputChange}/>
        {
            optional ? <button onClick={excludeClick}> {point.exclude} </button> : null
        }
    </>;
}