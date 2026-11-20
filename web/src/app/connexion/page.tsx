"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useId, useState } from "react";
import { login, sendCode } from "@/api/auth";
import { useAppContext } from "@/components/context-provider";
import {
  Button,
  Card,
  FieldError,
  fieldClass,
  labelClass,
  MascotNote,
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
  const errorId = useId();
  const phoneError = error && !codeSent ? error : null;
  const codeError = error && codeSent ? error : null;

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
          <div>
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
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? errorId : undefined}
              />
            </label>
            {phoneError && <FieldError id={errorId}>{phoneError}</FieldError>}
          </div>
          {codeSent && (
            <div>
              <label className={labelClass}>
                Code reçu par SMS
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className={phoneFieldClass}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby={codeError ? errorId : undefined}
                />
              </label>
              {codeError && <FieldError id={errorId}>{codeError}</FieldError>}
            </div>
          )}
          <Button type="submit" loading={sending}>
            {codeSent ? "Se connecter" : "Recevoir un code par SMS"}
          </Button>
          {codeSent && (
            <Button
              variant="quiet"
              onClick={() => {
                setCodeSent(false);
                setError(null);
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
