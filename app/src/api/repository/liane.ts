import { Liane } from "@/api";
import { get } from "@/api/http";

export interface ILianeRepository {
  get(): Promise<Liane[]>;
}

export class APILianeRepository implements ILianeRepository {

    get = async (): Promise<Liane[]> => get("/liane/");

}
