import { api } from "./index";
import type { Statement, Wallet } from "./types";

export const getWallet = () => api.get<Wallet>("/wallet");

export const openWallet = () => api.putAs<Wallet>("/wallet");

export const closeWallet = () => api.del("/wallet");

/** `month` : « 2026-11 ». */
export const getStatement = (month: string) =>
  api.get<Statement>(`/wallet/statement/${month}`);
