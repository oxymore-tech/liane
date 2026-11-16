import { api } from "./index";

type PushConfig = { vapid_public_key: string | null };

export const getPushConfig = () => api.get<PushConfig>("/push/config");

export const savePushSubscription = (subscription: PushSubscriptionJSON) =>
  api.post("/push/subscription", { body: subscription });

export const deletePushSubscription = (endpoint: string) =>
  api.del("/push/subscription", { body: { endpoint } });
