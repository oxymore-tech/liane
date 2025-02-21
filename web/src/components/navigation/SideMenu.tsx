import React, { useEffect, useLayoutEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavigationData } from "@/api/navigation";
import { getIconComponent } from "@/components/base/Icon";
import { Sidebar } from "flowbite-react";

export type SideMenuProps = {
  pages: { [path: string]: NavigationData };
};

export function SideMenu({ pages }: SideMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname === "/dashboard") router.replace("/");
  }, [router, pathname]);

  const [collapsed, setCollapsed] = React.useState(true);
  React.useEffect(() => {
    function handleResize() {
      setCollapsed(window.innerWidth < window.innerHeight);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });
  useLayoutEffect(() => {
    setCollapsed(window.innerWidth < window.innerHeight);
  }, []);

  const items = useMemo(() => Object.keys(pages).map(page => getMenuItem(page, pages[page], pathname)), [pages, pathname]);

  return (
    <Sidebar
      collapsed={collapsed}
      className="border-gray-300 dark:border-gray-700 h-full flex z-[8] border-r"
      theme={{
        root: { inner: "h-full overflow-y-auto overflow-x-hidden bg-gray-50 py-4 px-3 dark:bg-gray-800", collapsed: { off: "w-68" } }
      }}>
      <Sidebar.Items defaultValue="Accueil">
        <Sidebar.ItemGroup>{items}</Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}

const getMenuItem = (page: string, data: NavigationData, currentPathname: string, pathnamePrefix: string = "") => {
  return (
    <Sidebar.Item
      key={page}
      href={pathnamePrefix + page}
      className="justify-start"
      icon={getIconComponent(data.icon)}
      active={page === "/" ? currentPathname === "/" || currentPathname === pathnamePrefix : currentPathname.startsWith(pathnamePrefix + page)}>
      {data.name}
    </Sidebar.Item>
  );
};
