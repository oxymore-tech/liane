import React from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
import { LatLngLiteral } from "leaflet";

function OurMap({start, end}: { start: LatLngLiteral, end: LatLngLiteral }) {

  const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };

  return (
    <Map className="map" center={center} zoom={zoom}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
      />
      <Marker position={[51.505, -0.09]}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
    </Map>
  );
}

function App() {
  const start = {lat: 44.5180226, lng: 3.4991057};
  const end = {lat: 44.31901305, lng: 3.57802065202088};
  return (
    <div className="App">
      <OurMap start={start} end={end}/>
    </div>
  );
}

export default App;
