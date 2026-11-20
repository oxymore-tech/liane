"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getLiane } from "@/api/lianes";
import {
  followMessages,
  listMessages,
  markMessagesRead,
  sendMessage,
} from "@/api/messages";
import type { Message } from "@/api/types";
import { useAppContext } from "@/components/context-provider";
import { tripDateLabel } from "@/components/trip/labels";
import {
  Button,
  backLinkClass,
  buttonClass,
  Card,
  fieldClass,
  headerClass,
  linkClass,
  MascotNote,
  Notice,
  Page,
} from "@/components/ui";
import { cn } from "@/components/utils";

const MAX_LENGTH = 2000;

const byDate = (a: Message, b: Message) =>
  Date.parse(a.created_at) - Date.parse(b.created_at) ||
  a.id.localeCompare(b.id);

function EventLine({ message }: { message: Message }) {
  return (
    <li className="self-center px-4 text-center text-sm text-gris">
      {message.text}
      {message.data?.trip_id && (
        <>
          {" · "}
          <Link href={`/trajet/${message.data.trip_id}`} className={linkClass}>
            Voir le trajet
          </Link>
        </>
      )}
      <span className="block text-xs text-gris">
        {tripDateLabel(message.created_at)}
      </span>
    </li>
  );
}

function Bubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <li
      className={`flex max-w-[85%] flex-col ${isMine ? "items-end self-end" : "items-start self-start"}`}
    >
      {!isMine && (
        <span className="px-1 text-xs font-semibold text-gris">
          {message.author.pseudo ?? "Un membre"}
        </span>
      )}
      <p
        className={cn(
          "whitespace-pre-wrap break-words rounded-card px-4 py-2",
          isMine
            ? "bg-liane text-white"
            : "border border-bordure bg-white text-encre",
        )}
      >
        {message.text}
      </p>
      <span className="px-1 text-xs text-gris">
        {tripDateLabel(message.created_at)}
      </span>
    </li>
  );
}

export default function MessagesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: userLoading } = useAppContext();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: liane, isError } = useQuery({
    queryKey: ["liane", slug, user?.id ?? null],
    queryFn: () => getLiane(slug),
    enabled: !userLoading,
  });
  const lianeId = liane?.membership ? liane.id : undefined;
  const lastId = messages[messages.length - 1]?.id;

  const merge = useCallback((incoming: Message[]) => {
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      for (const message of incoming) byId.set(message.id, message);
      return [...byId.values()].sort(byDate);
    });
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      await markMessagesRead(id).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: ["my-lianes"] });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!lianeId) return;
    const loadLatest = async (isFirstLoad: boolean) => {
      const page = await listMessages(lianeId);
      merge(page.messages);
      if (isFirstLoad) setHasMore(page.has_more);
      setLoaded(true);
      await markRead(lianeId);
    };
    loadLatest(true).catch(() =>
      setError("Les messages n'ont pas pu être chargés."),
    );
    return followMessages(
      lianeId,
      (message) => {
        merge([message]);
        markRead(lianeId);
      },
      () => loadLatest(false).catch(() => {}),
    );
  }, [lianeId, merge, markRead]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: on descend en bas du fil à chaque nouveau dernier message
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  const loadOlder = async () => {
    if (!lianeId || messages.length === 0) return;
    const page = await listMessages(lianeId, messages[0].id);
    merge(page.messages);
    setHasMore(page.has_more);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!lianeId || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      merge([await sendMessage(lianeId, text)]);
      setText("");
    } catch {
      setError("Le message n'est pas parti. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  if (!userLoading && !user) {
    return (
      <Page title="Messages" backHref={`/l/${slug}`} backLabel="Liane">
        <Card className="flex flex-col gap-3">
          <p>Connectez-vous pour lire les messages de vos lianes.</p>
          <Link
            href={`/connexion?retour=${encodeURIComponent(`/l/${slug}/messages`)}`}
            className={buttonClass("primary")}
          >
            Se connecter
          </Link>
        </Card>
      </Page>
    );
  }
  if (isError || (liane && !liane.membership)) {
    return (
      <Page title="Messages" backHref={`/l/${slug}`} backLabel="Liane">
        <Card>Les messages sont réservés aux membres de cette liane.</Card>
      </Page>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-pierre text-encre">
      <header className={headerClass}>
        <Link href={`/l/${slug}`} className={backLinkClass}>
          ← Liane
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold">
          {liane ? `Messages · ${liane.name}` : "Messages"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <ul className="mx-auto flex w-full max-w-xl flex-col gap-3 p-4">
          {hasMore && (
            <li className="self-center">
              <Button variant="secondary" onClick={loadOlder}>
                Voir les messages précédents
              </Button>
            </li>
          )}
          {loaded && messages.length === 0 && (
            <li>
              <MascotNote>
                <p>Aucun message pour l'instant.</p>
              </MascotNote>
            </li>
          )}
          {messages.map((message) =>
            message.kind === "Text" ? (
              <Bubble
                key={message.id}
                message={message}
                isMine={message.author.id === user?.id}
              />
            ) : (
              <EventLine key={message.id} message={message} />
            ),
          )}
        </ul>
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="border-t border-bordure bg-white px-3 py-2"
      >
        {error && <Notice>{error}</Notice>}
        <div className="mx-auto flex w-full max-w-xl items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Votre message</span>
            <textarea
              rows={1}
              maxLength={MAX_LENGTH}
              placeholder="Écrire aux membres de la liane"
              className={cn(fieldClass, "mt-0 max-h-32 resize-none")}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <Button
            type="submit"
            loading={sending}
            disabled={!text.trim() || !lianeId}
          >
            Envoyer
          </Button>
        </div>
      </form>
    </main>
  );
}
