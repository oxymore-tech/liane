import dynamic from "next/dynamic";
const Map = dynamic(() => import("../components/map"), {ssr: false});

export default function Home() {
  const center = {lat: 44.33718916852679, lng: 3.483382165431976};
  const start = {label: "Blajoux_Parking", position: {lat: 44.33718916852679, lng: 3.483382165431976}}
  return <div>
    <Map className="w-full h-screen" center={center} start={start}></Map>
  </div>;
}
