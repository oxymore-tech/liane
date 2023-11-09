import { IconName } from "@/components/base/Icon";
export type NavigationData = {
  name: string;
  icon: IconName;
};
export const Navigation: { [path: string]: NavigationData } = {
  "/": {
    name: "Accueil",
    icon: "home"
  },
  "/dashboard/trip-records": {
    name: "Preuves de covoiturage",
    icon: "shield-check"
  },
  "/dashboard/rallying-points": {
    name: "Points de ralliement",
    icon: "pin"
  }
};
