import React, { memo, useEffect, useState } from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import { Map, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { LatLngLiteral } from "leaflet";
import { routingService } from "./api/routing-service";
import { Route } from "./api/route";
import * as math from "mathjs";
import moment from 'moment';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';


function formatDistance(distance: number) {
  const unit = math.unit(distance, 'm');
  return unit.format({notation: 'fixed', precision: 2});
}


function formatDuration(duration: number) {
    
    return moment.duration(duration,'seconds').humanize();
}

function createOverlay(start: LatLngLiteral, end: LatLngLiteral, center: LatLngLiteral, route?: Route) {
  
  const DefaultIcon = icon({
    iconUrl: icon,
    shadowUrl: iconShadow
  });
  
  if (route) {
    return <>
      <Marker position={center}>
        <Popup>
          <div>Distance: {formatDistance(route.distance)}</div>
          <div>Durée: {formatDuration(route.duration)}</div>
        </Popup>
      </Marker>
      <Marker position={start}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
      <Marker position={end}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
      <Polyline positions={route.coordinates}/>
    </>;
  } else {
    return null;
  }
}

function OurMapComponent({start, end}: { start: LatLngLiteral, end: LatLngLiteral }) {

  const [route, setRoute] = useState<Route>();
  
  useEffect(() => {
    routingService.basicRouteMethod({start, end})
      .then(r => setRoute(r))
  }, [start, end]);

  const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };

  const overlay = createOverlay(start, end, center, route);

  return <Map className="map" center={center} zoom={zoom}>
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
    />
    {overlay}
  </Map>;
}

const OurMap = memo(OurMapComponent);

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
