import { API_URL } from "./env";
import { HttpClient } from "./http";

export const api = new HttpClient(API_URL);
