import { Liane, LianeRequest } from "@/api";
import { get, postAs } from "@/api/http";

export interface ILianeRepository {
  get(): Promise<Liane[]>;
  post(liane: LianeRequest): Promise<Liane>;
}

export class APILianeRepository implements ILianeRepository {

    get = async (): Promise<Liane[]> => get("/liane/");

    post = async (liane: LianeRequest): Promise<Liane> => postAs<Liane>("/liane/", { body: liane });

}
