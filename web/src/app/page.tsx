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
  return (
    <div className="h-full w-full">
      <Map onZoom={setZoom}>
        {!!user && <LianeDisplayLayer />}
        <RallyingPointsLayer />
        {!!zoom && zoom < 8 && <ToastMessage message="Zoomez pour afficher les points de ralliement." level="info" />}
      </Map>
      <div className="absolute top-16 left-0 h-full w-full backdrop-blur-sm bg-white/30">
        <div className="container mt-16 pt-16 mx-auto p-8 bg-gray-800 rounded-xl">
          <div className="flex justify-between items-center">
            <div className="text-white p-16">
              <h1 className="text-3xl font-bold">
                Bientôt la version{" "}
                <span className="bg-gradient-to-r from-pink-600 via-orange-300 to-green-500 inline-block text-transparent bg-clip-text">beta !</span>
              </h1>
              <p className="text-lg py-8">Ouverture du test mi janvier 2025 : </p>
              <a
                className="text-pink-500 font-bold"
                href="https://sincere-bubble-ba4.notion.site/Contacts-liens-et-documents-utiles-1512a60606f68093bd46f6697a368ce1?pvs=4"
                target="_blank"
                rel="noreferrer">
                S&apos;inscrire pour participer au test
              </a>
              <div className="">
                <div className="m-8 flex flex-col gap-3">
                  <p>En attendant vous vous demandez</p>
                  <a
                    className="text-green-500 font-bold"
                    href="https://sincere-bubble-ba4.notion.site/A-propos-de-Liane-1522a60606f6800482e0fb26e87c844c"
                    target="_blank"
                    rel="noreferrer">
                    C&apos;est quoi liane ?
                  </a>
                  <a
                    className="text-green-500 font-bold"
                    href="https://sincere-bubble-ba4.notion.site/FAQ-du-test-de-Liane-1512a60606f680c8b803dfba0a3fc871?pvs=4"
                    target="_blank"
                    rel="noreferrer">
                    Pourquoi une phase de test ?
                  </a>
                </div>
                <div className="flex justify-between items-center flex-col">
                  <div>Fabriqué depuis les cévennes et soutenu par</div>
                  <div className="flex gap-6 items-center">
                    <div>
                      <img
                        src="https://sincere-bubble-ba4.notion.site/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2F0664d63a-f2b3-48d0-9685-6b2b57b3fc28%2F969a7469-cd6a-4216-bd9c-feb480c05a7c%2FLOGO_ANCTMarianne.jpg?table=block&id=1522a606-06f6-807a-9542-c6c4a033f885&spaceId=0664d63a-f2b3-48d0-9685-6b2b57b3fc28&width=670&userId=&cache=v2"
                        alt="Logo ANCT"
                        title="Soutenu par l'ANCT"
                        width={100}
                      />
                    </div>
                    <img
                      src="https://sincere-bubble-ba4.notion.site/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2F0664d63a-f2b3-48d0-9685-6b2b57b3fc28%2Fcda76e12-a686-4c22-a03b-c45184a38894%2FRgionOccitanie.jpg?table=block&id=1522a606-06f6-8005-8f4f-c03ccbaf2942&spaceId=0664d63a-f2b3-48d0-9685-6b2b57b3fc28&width=190&userId=&cache=v2"
                      alt="Logo Occitanie"
                      title="Soutenu par la région Occitanie"
                      width={100}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-64 mx-auto">
              <img
                src="https://sincere-bubble-ba4.notion.site/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2F0664d63a-f2b3-48d0-9685-6b2b57b3fc28%2F7627ec49-ca47-4aff-a45c-bd768d412078%2FIMG_1685.png?table=block&id=1522a606-06f6-804e-b12b-e58568b39283&spaceId=0664d63a-f2b3-48d0-9685-6b2b57b3fc28&width=380&userId=&cache=v2"
                alt="Carte"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
