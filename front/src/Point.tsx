import {LatLngLiteral} from "leaflet";
import React, {Component, useState} from "react";
import {Map, TileLayer, Popup, Marker} from "react-leaflet";

export interface Point {

    readonly coordinate:LatLngLiteral;
    readonly address:string;
    readonly exclude:boolean;
}


export function PointComponent({onClick,point,optional}:{onClick?:Function,point:Point,optional?:boolean}) {
    const [modifiedPoint,setModifiedPoint] = useState(point);
    
    function excludeClick(){
        setModifiedPoint(point => ({...point, exclude:!point.exclude}) );
    }

    function pointOverlay(point:Point,optional:boolean){
        return <>
            <div> {JSON.stringify(point)} </div>
            {/* if optional show this button and onClick={excludeClick}*/}
            {
                optional||false?<button onClick={excludeClick} > {point.exclude} </button>:null
            }
        </>
    }

    return pointOverlay(point,optional||false) ;
}