"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { deleteMe, updateMe } from "@/api/auth";
import { useAppContext } from "@/components/context-provider";
import { MyTabs } from "@/components/my-tabs";
import {
  Button,
  buttonClass,
  Card,
  fieldClass,
  Notice,
  Page,
} from "@/components/ui";

function NameForm() {
  const { user, refreshUser } = useAppContext();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">(
    "idle",
  );

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
  }, [user?.first_name, user?.last_name]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    try {
      await updateMe(firstName, lastName);
      await refreshUser();
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Mon nom</h2>
        <p className="text-sm text-gray-600">
          Les autres membres de vos lianes voient votre prénom et l'initiale de
          votre nom{user?.pseudo ? ` : ${user.pseudo}` : ""}. Votre numéro de
          téléphone ne leur est jamais montré.
        </p>
        <label className="text-sm font-medium">
          Prénom
          <input
            className={fieldClass}
            value={firstName}
            autoComplete="given-name"
            onChange={(event) => {
              setFirstName(event.target.value);
              setStatus("idle");
            }}
          />
        </label>
        <label className="text-sm font-medium">
          Nom
          <input
            className={fieldClass}
            value={lastName}
            autoComplete="family-name"
            onChange={(event) => {
              setLastName(event.target.value);
              setStatus("idle");
            }}
          />
        </label>
        {status === "failed" && (
          <Notice>
            Le nom n'a pas été enregistré. Le prénom et le nom sont nécessaires.
          </Notice>
        )}
        {status === "saved" && (
          <output className="text-sm font-semibold text-emerald-700">
            C'est enregistré.
          </output>
        )}
        <Button
          type="submit"
          disabled={
            status === "saving" || !firstName.trim() || !lastName.trim()
          }
        >
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const { forgetUser } = useAppContext();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    setSending(true);
    setFailed(false);
    try {
      await deleteMe();
    } catch {
      setFailed(true);
      setSending(false);
      return;
    }
    forgetUser();
    router.push("/");
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Supprimer mon compte</h2>
      {!confirming ? (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          Supprimer mon compte
        </Button>
      ) : (
        <>
          <p className="text-sm text-gray-700">
            Votre nom, votre numéro de téléphone et vos messages sont effacés.
            Vous quittez toutes vos lianes ; les trajets à venir que vous
            conduisez sont annulés et leurs passagers prévenus.
          </p>
          <p className="text-sm text-gray-700">
            Les trajets déjà faits et confirmés restent enregistrés sans votre
            nom, comme preuve de covoiturage. C'est définitif.
          </p>
          {failed && (
            <Notice>La suppression n'a pas fonctionné. Réessayez.</Notice>
          )}
          <Button variant="danger" disabled={sending} onClick={remove}>
            Oui, supprimer définitivement
          </Button>
          <Button
            variant="secondary"
            disabled={sending}
            onClick={() => setConfirming(false)}
          >
            Non, garder mon compte
          </Button>
        </>
      )}
    </Card>
  );
}

export default function ProfilePage() {
  const { user, loading, logout } = useAppContext();

  if (!loading && !user) {
    return (
      <Page title="Mon profil">
        <Card className="flex flex-col gap-3">
          <p>Connectez-vous pour voir votre profil.</p>
          <Link
            href="/connexion?retour=%2Fprofil"
            className={buttonClass("primary")}
          >
            Se connecter
          </Link>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Mon profil">
      <MyTabs />
      {user && (
        <>
          <NameForm />
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Ma connexion</h2>
            <p className="text-sm text-gray-600">Téléphone : {user.phone}</p>
            <Button variant="secondary" onClick={logout}>
              Se déconnecter
            </Button>
          </Card>
          <DeleteAccount />
        </>
      )}
    </Page>
  );
}
