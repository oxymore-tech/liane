"use client";
import React, { useState } from "react";
import Map from "@/components/map/Map";
import { RallyingPointsLayer } from "@/components/map/layers/RallyingPointsLayer";
import { useCurrentUser } from "@/components/ContextProvider";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { ToastMessage } from "@/components/base/ToastMessage";

export default function Home() {
  const user = useCurrentUser();

  const [zoom, setZoom] = useState<number | undefined>();
  if (!user) {
    return (
      <div className="lg:m-32 text-gray-200 lg:mx-auto lg:p-16 pt-32 text-center ">
        <h1 className="font-bold text-xl lg:text-5xl">
          Version{" "}
          <span className="bg-gradient-to-r from-pink-600 via-orange-300 to-green-500 inline-block text-transparent text-xl lg:text-5xl bg-clip-text">
            beta
          </span>
          {" disponible en 2025 !"}
        </h1>
        <div className="lg:flex items-center justify-center lg:my-8">
          <div className="flex flex-col items-center py-4">
            <div className="w-48 mx-auto py-4">
              <img
                src="https://sincere-bubble-ba4.notion.site/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2F0664d63a-f2b3-48d0-9685-6b2b57b3fc28%2F7627ec49-ca47-4aff-a45c-bd768d412078%2FIMG_1685.png?table=block&id=1522a606-06f6-804e-b12b-e58568b39283&spaceId=0664d63a-f2b3-48d0-9685-6b2b57b3fc28&width=380&userId=&cache=v2"
                alt="Carte"
              />
            </div>
            <div className="flex items-center gap-3">
              <img
                className="object-cover h-14"
                src="logos/google-play-badge.png"
                alt="Télécharger Liane sur Google Play"
                title="Télécharger Liane sur Google Play"
              />
              <img
                className="object-cover h-11"
                src="logos/Download_on_the_App_Store_Badge_FRCA_RGB_blk.svg.png"
                alt="Télécharger Liane sur l'App Store"
                title="Télécharger Liane sur l'App Store"
              />
            </div>
          </div>
          <div className="flex py-10 text-lg justify-between items-center">
            <a
              className="hover:border-pink-400 text-pink-500 font-bold mx-4 rounded bg-pink-200 px-4 py-2 hover:bg-pink-400 hover:text-pink-800 items-center text-center"
              href="https://sincere-bubble-ba4.notion.site/Contacts-liens-et-documents-utiles-1512a60606f68093bd46f6697a368ce1?pvs=4"
              target="_blank"
              rel="noreferrer">
              Je souhaite devenir testeur
            </a>
          </div>
        </div>

        <div className="">
          <div className="my-4 flex flex-col lg:flex-row lg:justify-around gap-3">
            <a
              className="text-green-500 font-bold"
              href="https://sincere-bubble-ba4.notion.site/A-propos-de-Liane-1522a60606f6800482e0fb26e87c844c"
              target="_blank"
              rel="noreferrer">
              Covoiturage de campagne ?
            </a>
            <a
              className="text-green-500 font-bold"
              href="https://sincere-bubble-ba4.notion.site/FAQ-du-test-de-Liane-1512a60606f680c8b803dfba0a3fc871?pvs=4"
              target="_blank"
              rel="noreferrer">
              Pourquoi une phase de test ?
            </a>
          </div>
          <div className="flex flex-col items-center gap-4 justify-center w-full bg-gray-900 lg:fixed left-0 bottom-0">
            <div className="text-sm mt-8">Fabriqué avec passion depuis les Cévennes</div>
            <div className="flex flex-col lg:flex-row gap-6 items-center my-8">
              <a href="https://agence-cohesion-territoires.gouv.fr/">
                <img className="object-cover h-14" src="logos/LOGO-ANCT+Marianne.png" alt="Logo ANCT" title="L'ANCT" />
              </a>
              <a href="https://www.laregion.fr/">
                <img className="object-cover h-14" src="logos/occitanie.webp" alt="Logo Occitanie" title="La région Occitanie" />
              </a>
              <div className="flex gap-8">
                <a href="https://petr-sud-lozere.fr/">
                  <img
                    className="object-cover h-14 bg-white rounded p-1"
                    src="logos/LOGO%20PETR%20PNG.PNG"
                    alt="Logo PETR Sud Lozère"
                    title="PETR Sud Lozère"
                  />
                </a>
                <a href="https://www.commingespyrenees.fr/">
                  <img
                    className="object-cover h-14"
                    src="logos/commingespyrenees.png"
                    alt="Logo PETR Pays Comminges Pyrénées"
                    title="PETR Pays Comminges Pyrénées"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <Map></Map>;
}
