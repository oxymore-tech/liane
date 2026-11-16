"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { login, sendCode } from "@/api/auth";
import { useAppContext } from "@/components/context-provider";
import { Button, Card, Notice, Page } from "@/components/ui";

const fieldClass =
  "mt-1 block w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg";

const safeReturnPath = (path: string | null) =>
  path?.startsWith("/") && !path.startsWith("//") ? path : "/";

function LoginPage() {
  const router = useRouter();
  const returnPath = safeReturnPath(useSearchParams().get("retour"));
  const { refreshUser } = useAppContext();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      if (!codeSent) {
        await sendCode(phone);
        setCodeSent(true);
      } else {
        await login(phone, code);
        await refreshUser();
        router.replace(returnPath);
      }
    } catch {
      setError(
        codeSent
          ? "Ce code n'est pas le bon, ou il a expiré."
          : "Impossible d'envoyer le code. Vérifiez le numéro.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Page
      title="Connexion"
      backHref={returnPath.split("?")[0]}
      backLabel="Retour"
    >
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm font-medium">
            Votre numéro de téléphone
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="06 12 34 56 78"
              className={fieldClass}
              value={phone}
              disabled={codeSent}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          {codeSent && (
            <label className="text-sm font-medium">
              Code reçu par SMS
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className={fieldClass}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
          )}
          {error && <Notice>{error}</Notice>}
          <Button type="submit" disabled={sending}>
            {codeSent ? "Se connecter" : "Recevoir un code par SMS"}
          </Button>
          {codeSent && (
            <Button
              variant="quiet"
              onClick={() => {
                setCodeSent(false);
                setCode("");
              }}
            >
              Changer de numéro
            </Button>
          )}
        </form>
      </Card>
      <p className="text-sm text-gray-500">
        Pas besoin de mot de passe : un code vous est envoyé à chaque connexion.
      </p>
    </Page>
  );
}

export default function Route() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
