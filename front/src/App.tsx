import React, {memo, useEffect, useState} from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import {Map, Marker, Polyline, Popup, TileLayer} from 'react-leaflet';
import {icon, LatLngLiteral} from "leaflet";
import {routingService} from "./api/routing-service";
import {Route} from "./api/route";
import * as math from "mathjs";
import moment from 'moment';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconShadow from 'leaflet/dist/images/marker-shadow.png';
import {RoutingQuery} from "./api/routing-query";

enum Scenario {
  DefaultRoute = 1,
  Alternatives,
  CrossWaypoint,
  Detour
}

function formatDistance(distance: number) {
  const unit = math.unit(distance, 'm');
  return unit.format({notation: 'fixed', precision: 2});
}
function formatDuration(duration: number) {
  return moment.duration(duration, 'seconds').humanize();
}

function createOverlay(start: LatLngLiteral, end: LatLngLiteral, center: LatLngLiteral,scenario:Scenario, route?: Route) {
  const customIcon = icon({
    iconUrl: markerIcon,
    shadowUrl: markerIconShadow
  });
  
  if (route) {
    return <>
      <Marker position={center} icon={customIcon}>
        <Popup>
          <div>Distance: {formatDistance(route.distance)}</div>
          <div>Durée: {formatDuration(route.duration)}</div>
        </Popup>
      </Marker>
      <Marker position={start} icon={customIcon}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
      <Marker position={end} icon={customIcon}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
      <Polyline positions={route.coordinates}/>
    </>;
  } else {
    return null;
  }
}

function aMap(overlay: JSX.Element|null, center: LatLngLiteral, zoom: number) {
  return <Map className="map" center={center} zoom={zoom}>
    <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
    />
    {overlay}
  </Map>;
}

function DefaultRouteComponent({start, end}: {start: LatLngLiteral, end: LatLngLiteral}){
  
  const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };
  
  const [route, setRoute] = useState<Route>();

  useEffect(() => {
    routingService.DefaultRouteMethod(new RoutingQuery(start, end))
        .then(r => setRoute(r));
  }, [start, end]);
  
  let overlay = defaultRouteOverlay(start,end,center,route);
  
  return aMap(overlay,center,zoom);
}

function AlternativesComponent({start, end}: {start: LatLngLiteral, end: LatLngLiteral} ) {
  const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };
  
  const [alternatives, setAlternatives] = useState<Route[]>()

  useEffect(() => {
    routingService.GetAlternatives(new RoutingQuery(start, end))
        .then(r => setAlternatives(r) );
  }, [start, end]);

  let overlay = alternativesOverlay(start, end, alternatives);

  return aMap(overlay,center,zoom);
}

function WaypointRouteComponent({start, end, point}: {start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral}){
  const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };
  
  let overlay = DefaultRouteComponent({start,end});

  const [route, setRoute] = useState<Route>();

  useEffect(() => {
    routingService.DefaultRouteMethod(new RoutingQuery(start, end, point),"waypoint")
        .then(r => setRoute(r));
  }, [start, end]);
  
  overlay = <>
    {overlay}
    {crossWaypointOverlay(start,end,point,route)}
  </>;
  
  return aMap(overlay,center,zoom);
}

function DetourRouteComponent(start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral){
  const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };
  
  return null;
}


function defaultRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, center: { lng: number; lat: number }, route: Route | undefined) {
  const customIcon = icon({
    iconUrl: markerIcon,
    shadowUrl: markerIconShadow
  });

  if (route) {
    return <>
      <Marker position={center} icon={customIcon}>
        <Popup>
          <div>Distance: {formatDistance(route.distance)}</div>
          <div>Durée: {formatDuration(route.duration)}</div>
        </Popup>
      </Marker>
      <Marker position={start} icon={customIcon}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
      <Marker position={end} icon={customIcon}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
      <Polyline positions={route.coordinates}/>
    </>;
  } else {
    return null;
  }
}

function alternativesOverlay(start: LatLngLiteral, end: LatLngLiteral, routes: Route[] | undefined) {
  const customIcon = icon({
    iconUrl: markerIcon,
    shadowUrl: markerIconShadow
  });

  if (routes) {
    let overlay = <>
      <Marker position={start} icon={customIcon}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
      <Marker position={end} icon={customIcon}>
        <Popup>A pretty CSS3 popup.<br/>Easily customizable.</Popup>
      </Marker>
    </>;
    let n = routes.length;
    for (let i = 0; i<n; i++){
      let route = routes[i];
      let l = route.coordinates.length
      let center = route.coordinates[l/2];
      overlay = <>
        {overlay}
        <Marker position={center} icon={customIcon}>
          <Popup>
            <div>Distance: {formatDistance(route.distance)}</div>
            <div>Durée: {formatDuration(route.duration)}</div>
          </Popup>
        </Marker>
        <Polyline positions={route.coordinates}/>
      </>
    }
    return overlay;
  } else {
    return null;
  }
}

function crossWaypointOverlay(start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral, route: Route | undefined) {
  return <> </>;
}

function OurMapComponent({start, end, scenario, point}: { start: LatLngLiteral, end: LatLngLiteral, scenario: Scenario, point: LatLngLiteral }) {

  /*const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };

  let overlay:string;

  const [route, setRoute] = useState<Route>();
  
  switch (scenario){
    case Scenario.DefaultRoute:
      
      overlay = defaultRouteMethod(start, end, center);
      break
    
    case Scenario.Alternatives:
      overlay = getAlternatives(start, end);
      break
    
    case Scenario.CrossWaypoint:
      useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end, point))
            .then(r => setRoute(r));
      }, [start, end]);

      const [wayPoint, setWayPoint] = useState<Route>()
        
      useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end, point), "waypoint")
            .then(r => setWayPoint(r));
      }, [start, end]);
      
      overlay = crossWaypointOverlay(start,end,point,route,wayPoint);
      break
    
    case Scenario.Detour:
      useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end, point))
            .then(r => setRoute(r));
      }, [start, end]);

      const [detourPoint, setDetourPoint] = useState<Route>()

      useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end, point), "detour")
            .then(r => setDetourPoint(r));
      }, [start, end]);

      overlay = crossWaypointOverlay(start,end,point,route,detourPoint);

      break

          
  }

  return <Map className="map" center={center} zoom={zoom}>
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
    />
    {overlay}
  </Map>;*/
}

//const OurMap = memo(OurMapComponent);

const DefaultRoute = memo(DefaultRouteComponent);
const Alternatives = memo(AlternativesComponent);
const WaypointRoute = memo(WaypointRouteComponent);
//const DetourRoute = memo(DetourRouteComponent);


function App() {

  const start = {lat: 44.5180226, lng: 3.4991057};
  const end = {lat: 44.31901305, lng: 3.57802065202088};
  const waypoint = {lat: , lng: };
  
  return (
    <div className="App">
      <DefaultRoute start={start} end={end}/>
      <Alternatives start={start} end={end}/>
    </div>
  );
}
//<Alternatives start={start} end={end}/>
//<WaypointRoute start={start} end={end} point={waypoint}/>

export default App;
