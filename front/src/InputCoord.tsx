import {LatLngLiteral} from "leaflet";
import React, {Component} from "react";
import {Map, TileLayer, Popup, Marker} from "react-leaflet";


function mapClick(point:LatLngLiteral){
    this.setState({ myCoord: click.latlng, saved: false });
}
function validateClick(click){
    this.state.myCoord;
    this.setState({myCoord: prevState.myCoord,})
}


export function InputCoordComponent({point,status}:{point:LatLngLiteral,status:boolean}) {
    
    return <div>
        <button onClick={validateClick()}> Cliquer ici pour valider </button>
        <Map center={this.props.center} zoom={this.props.zoom} onClick={mapClick(point)}>
            <TileLayer
                url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
            />
            { this.state.myCoord && <Marker position={this.state.myCoord} draggable={true}>
                <Popup position={this.state.myCoord}>
                    Current location: <pre>{JSON.stringify(this.state.myCoord, null, 2)}</pre>
                </Popup>
            </Marker>}
        </Map>
    </div>;
   
    
}