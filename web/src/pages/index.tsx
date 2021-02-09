import Head from 'next/head'
import { Blabla } from '../components/blabla';
import dynamic from "next/dynamic";
const Map = dynamic(() => import("../components/map"), {ssr: false});

export default function Home() {
  return <div>
    <Map className="w-full h-screen"/>
  </div>;
}
