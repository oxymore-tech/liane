"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { deleteMe, updateMe } from "@/api/auth";
import { useAppContext } from "@/components/context-provider";
import { ConfirmDialog } from "@/components/dialog";
import { MyTabs } from "@/components/my-tabs";
import {
  Button,
  buttonClass,
  Card,
  fieldClass,
  labelClass,
  mutedClass,
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
        <p className={mutedClass}>
          Les autres membres de vos lianes voient votre prénom et l'initiale de
          votre nom{user?.pseudo ? ` : ${user.pseudo}` : ""}. Votre numéro de
          téléphone ne leur est jamais montré.
        </p>
        <label className={labelClass}>
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
        <label className={labelClass}>
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
          <Notice tone="success">C'est enregistré.</Notice>
        )}
        <Button
          type="submit"
          loading={status === "saving"}
          disabled={!firstName.trim() || !lastName.trim()}
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
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    setFailed(false);
    try {
      await deleteMe();
    } catch {
      setFailed(true);
      return;
    }
    forgetUser();
    router.push("/");
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Supprimer mon compte</h2>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Supprimer mon compte
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title="Supprimer mon compte ?"
        confirmLabel="Oui, supprimer définitivement"
        cancelLabel="Non, garder mon compte"
        destructive
        error={failed ? "La suppression n'a pas fonctionné. Réessayez." : null}
      >
        <p>
          Votre nom, votre numéro de téléphone et vos messages sont effacés.
          Vous quittez toutes vos lianes ; les trajets à venir que vous
          conduisez sont annulés et leurs passagers prévenus.
        </p>
        <p>
          Les trajets déjà faits et confirmés restent enregistrés sans votre
          nom, comme preuve de covoiturage. C'est définitif.
        </p>
      </ConfirmDialog>
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
            <p className={mutedClass}>Téléphone : {user.phone}</p>
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
