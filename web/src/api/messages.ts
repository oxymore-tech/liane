import { api } from "./index";
import type { Message, MessagePage } from "./types";

export const listMessages = (lianeId: string, before?: string) =>
  api.get<MessagePage>(`/liane/${lianeId}/message`, { params: { before } });

export const sendMessage = (lianeId: string, text: string) =>
  api.postAs<Message>(`/liane/${lianeId}/message`, { body: { text } });

export const markMessagesRead = (lianeId: string) =>
  api.post(`/liane/${lianeId}/message/read`);

const RECONNECT_DELAY_MS = 3000;

/**
 * Suit le fil d'une liane en direct (Server-Sent Events lus avec fetch, pour envoyer le jeton).
 * `onResync` signale que des messages ont pu être manqués : il faut relire le fil.
 * Renvoie la fonction qui arrête le suivi.
 */
export function followMessages(
  lianeId: string,
  onMessage: (message: Message) => void,
  onResync: () => void,
) {
  const controller = new AbortController();

  const dispatch = (block: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    if (event === "resync") onResync();
    if (event === "message" && data.length > 0) {
      onMessage(JSON.parse(data.join("\n")));
    }
  };

  const read = async () => {
    const response = await api.openStream(
      `/liane/${lianeId}/message/stream`,
      controller.signal,
    );
    if (response.status >= 400 && response.status < 500) {
      // plus membre de la liane, ou plus connecté : inutile de réessayer
      controller.abort();
      return;
    }
    const reader = response.body?.getReader();
    if (!response.ok || !reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      blocks.forEach(dispatch);
    }
  };

  const run = async () => {
    let isFirstConnection = true;
    while (!controller.signal.aborted) {
      try {
        if (!isFirstConnection) onResync();
        isFirstConnection = false;
        await read();
      } catch {
        // connexion coupée : on réessaie plus bas
      }
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
    }
  };
  run();

  return () => controller.abort();
}
