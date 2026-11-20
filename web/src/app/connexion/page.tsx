"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { login, sendCode } from "@/api/auth";
import { useAppContext } from "@/components/context-provider";
import {
  Button,
  Card,
  fieldClass,
  labelClass,
  MascotNote,
  Notice,
  Page,
} from "@/components/ui";
import { cn } from "@/components/utils";

const phoneFieldClass = cn(fieldClass, "text-lg");

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
          <label className={labelClass}>
            Votre numéro de téléphone
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="06 12 34 56 78"
              className={phoneFieldClass}
              value={phone}
              disabled={codeSent}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          {codeSent && (
            <label className={labelClass}>
              Code reçu par SMS
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className={phoneFieldClass}
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
      <MascotNote>
        <p className="text-sm">
          Pas besoin de mot de passe : un code vous est envoyé à chaque
          connexion.
        </p>
      </MascotNote>
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
