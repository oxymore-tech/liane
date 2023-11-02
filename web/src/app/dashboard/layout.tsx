"use client";
import React, { PropsWithChildren } from "react";
import { useCurrentUser } from "@/components/ContextProvider";
import { Header } from "@/components/navigation/Header";
import { SideMenu } from "@/components/navigation/SideMenu";
import { Navigation } from "@/api/navigation";
import { Flowbite } from "flowbite-react";

export default function DashboardLayout({ children }: PropsWithChildren) {
  return children;
}

export const PageLayout = ({ children }: PropsWithChildren) => {
  const user = useCurrentUser();

  return (
    <main className="h-screen w-full flex flex-col dark:bg-gray-900">
      <Flowbite>
        <Header />
        <div className="grow w-full">
          {!!user && (
            <div className="flex h-full">
              <SideMenu pages={Navigation} />
              <div className="flex h-full w-full">{children}</div>
            </div>
          )}
          {!user && children}
        </div>
      </Flowbite>
    </main>
  );
};
