import React from "react";
import './App.css';
import 'leaflet/dist/leaflet.css';
import { DefaultRoute } from "./DefaultRoute";


function App() {

  const start = {coordinate: {lat: 44.5180226, lng: 3.4991057}, address: "Mende", exclude: false};
  const end = {coordinate: {lat: 44.31901305, lng: 3.57802065202088}, address: "Florac", exclude: false};
  const waypoint = {lat: 44.38624954223633, lng: 3.6189568042755127};
  const detour = {lat: 44.46151681242642, lng: 3.459056828828282};

  const start2 = {lat: 44.480286, lng: 3.456429};
  const end2 = {lat: 44.376555, lng: 3.521215};
  return (
    <div className="App">

      <DefaultRoute start={start} end={end}/>


      {/*
      <table>
        <tr>
          <th>Scenario</th>
          <th>Route</th>
        </tr>
        <tr>
        <td>Route par défaut (la plus rapide)</td>
        <td>
          <DefaultRoute start={start} end={end}/>
        </td>
      </tr>
        <tr>
          <td>Alternatives :</td>
          <td>
            <Alternatives start={start} end={end}/>
          </td>
        </tr>
        <tr>
          <td>Point de passage :</td>
          <td>
            <WaypointRoute start={start} end={end} point={waypoint}/>
          </td>
        </tr>
        <tr>
          <td>Point de passage :</td>
          <td>
            <DetourRoute start={start} end={end} point={detour}/>
          </td>
        </tr>
      </table>  
      
      */}
    </div>
  );
}


export default App;
