import React from "react";
import { usePathname } from "next/navigation";
import { NavigationData } from "@/api/navigation";
import { getIconComponent } from "@/components/base/Icon";
import { Sidebar } from "flowbite-react";

export type SideMenuProps = {
  pages: { [path: string]: NavigationData };
};

export function SideMenu({ pages }: SideMenuProps) {
  const pathname = usePathname();
  //console.log(pathname);

  return (
    <Sidebar theme={{ root: { inner: "h-full overflow-y-auto overflow-x-hidden bg-gray-50 py-4 px-3 dark:bg-gray-800" } }}>
      <Sidebar.Items defaultValue={"Accueil"}>
        <Sidebar.ItemGroup>
          {Object.entries(pages).map(page => (
            <Sidebar.Item
              key={page[0]}
              href={page[0]}
              icon={getIconComponent(page[1].icon)}
              active={page[0] === "/" ? pathname === "/" : pathname.startsWith(page[0])}>
              {page[1].name}
            </Sidebar.Item>
          ))}
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
