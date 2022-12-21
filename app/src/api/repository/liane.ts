import { Liane } from "@/api";

export async function getLianes(): Promise<Liane[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return [];
}