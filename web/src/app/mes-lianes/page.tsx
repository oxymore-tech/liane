"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listMyLianes } from "@/api/lianes";
import { useAppContext } from "@/components/context-provider";
import {
  daysLabel,
  memberCountLabel,
  sectionLabel,
} from "@/components/liane/labels";
import { Button, buttonClass, Card, Page } from "@/components/ui";

export default function MyLianesPage() {
  const { user, loading, logout } = useAppContext();
  const { data: lianes } = useQuery({
    queryKey: ["my-lianes", user?.id],
    queryFn: listMyLianes,
    enabled: Boolean(user),
  });

  if (!loading && !user) {
    return (
      <Page title="Mes lianes">
        <Card className="flex flex-col gap-3">
          <p>Connectez-vous pour retrouver vos lianes.</p>
          <Link
            href="/connexion?retour=%2Fmes-lianes"
            className={buttonClass("primary")}
          >
            Se connecter
          </Link>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Mes lianes">
      {lianes?.length === 0 && (
        <Card className="flex flex-col gap-3">
          <p>Vous n'avez rejoint aucune liane pour l'instant.</p>
          <Link href="/" className={buttonClass("primary")}>
            Voir les lianes sur la carte
          </Link>
        </Card>
      )}
      {lianes?.map((liane) => (
        <Link key={liane.id} href={`/l/${liane.slug}`}>
          <Card>
            <h2 className="text-lg font-bold">{liane.name}</h2>
            <p>
              {sectionLabel(liane, liane.membership)} ·{" "}
              {daysLabel(liane.membership.week_days)}
              {liane.membership.can_drive && " · vous pouvez conduire"}
            </p>
            <p className="text-sm text-gray-500">
              {memberCountLabel(liane.member_count)}
              {!liane.is_active && " · liane désactivée"}
            </p>
          </Card>
        </Link>
      ))}
      {user && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Connecté : {user.pseudo ?? user.phone}</span>
          <Button variant="quiet" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      )}
    </Page>
  );
}
