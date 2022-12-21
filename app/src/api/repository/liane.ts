import { Liane } from "@/api";

export const getLianes = async (): Promise<Liane[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  // throw new Error("eeeee");
  return [];
};