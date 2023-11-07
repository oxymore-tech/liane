"use client";
import React from "react";
import { Tabs, TabsComponent } from "flowbite-react";
import { getIconComponent } from "@/components/base/Icon";
import { RallyingPointsMapPage } from "@/app/dashboard/rallying-points/tabs/map-view";
import { RallyingPointsTablePage } from "@/app/dashboard/rallying-points/tabs/table-view";

export default function RallyingPointsPage() {
  return (
    <TabsComponent
      theme={{
        base: "grid grid-rows-[auto_minmax(0,_1fr)] w-full h-full",
        tabpanel: "w-full h-full"
      }}
      aria-label="Administration des points de ralliement"
      style="underline">
      <Tabs.Item active title="Carte" icon={getIconComponent("map")}>
        <div className=" w-full h-full">
          <RallyingPointsMapPage />
        </div>
      </Tabs.Item>
      <Tabs.Item title="Import / Export" icon={getIconComponent("table")}>
        <RallyingPointsTablePage />
      </Tabs.Item>
      <Tabs.Item title="Demandes d'ajout" icon={getIconComponent("mails")}>
        TODO
      </Tabs.Item>
    </TabsComponent>
  );
}
