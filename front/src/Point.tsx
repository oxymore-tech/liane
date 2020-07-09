import {LatLngLiteral} from "leaflet";
import React, {Component, useState} from "react";
import {Map, TileLayer, Popup, Marker} from "react-leaflet";

export interface Point {
    readonly coordinate:LatLngLiteral;
    readonly address:string;
    readonly exclude:boolean;
}


export function PointComponent({onChange,index,point,optional}:{onChange?:(i:number,p?:Point)=>void,index:number,point:Point,optional?:boolean}) {
    const [modifiedPoint,setModifiedPoint] = useState(point);
    
    function excludeClick(){
        setModifiedPoint(point => ({...point, exclude:!point.exclude}) );
        if (onChange){ onChange(-1,modifiedPoint) }
    }
    
    function selectClick(){
        if (onChange){ onChange(index) }
    }
    
    function pointOverlay(point:Point,optional:boolean){
        return <>
            <div onClick={selectClick}> {JSON.stringify(point)} </div>
            {
                optional||false?<button onClick={excludeClick} > {point.exclude} </button>:null
            }
        </>
    }

    return pointOverlay(point,optional||false) ;
}