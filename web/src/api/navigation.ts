import { IconName } from "@/components/base/Icon";
export type NavigationData = {
  name: string;
  icon: IconName;
};
export const Navigation: { [path: string]: NavigationData } = {
  "/admin": {
    name: "Accueil",
    icon: "home"
  },
  "/admin/dashboard/trip_record": {
    name: "Preuves de covoiturage",
    icon: "shield-check"
  },
  "/admin/dashboard/rallying_point": {
    name: "Points de ralliement",
    icon: "pin"
  }
};
