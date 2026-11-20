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
import { UnreadBadge } from "@/components/liane/unread-badge";
import { MyTabs } from "@/components/my-tabs";
import { NotificationSettings } from "@/components/notifications";
import {
  Button,
  buttonClass,
  Card,
  MascotNote,
  mutedClass,
  Page,
} from "@/components/ui";

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
      <MyTabs />
      {lianes?.length === 0 && (
        <MascotNote>
          <p>Vous n'avez rejoint aucune liane pour l'instant.</p>
          <Link href="/" className={buttonClass("primary")}>
            Voir les lianes sur la carte
          </Link>
        </MascotNote>
      )}
      {lianes?.map((liane) => (
        <Card key={liane.id} className="flex flex-col gap-2">
          <Link href={`/l/${liane.slug}`} className="block">
            <h2 className="text-xl font-extrabold">{liane.name}</h2>
            <p>
              {sectionLabel(liane, liane.membership)} ·{" "}
              {daysLabel(liane.membership.week_days)}
              {liane.membership.can_drive && " · vous pouvez conduire"}
            </p>
            <p className={mutedClass}>
              {memberCountLabel(liane.member_count)}
              {!liane.is_active && " · liane désactivée"}
            </p>
          </Link>
          <Link
            href={`/l/${liane.slug}/messages`}
            className={`${buttonClass("secondary")} justify-between`}
          >
            <span>Messages</span>
            <UnreadBadge count={liane.unread_count} />
          </Link>
        </Card>
      ))}
      {user && <NotificationSettings />}
      {user && (
        <div className="flex min-h-11 items-center justify-between gap-3 px-1 text-sm">
          <Link href="/profil" className="text-liane underline">
            Mon profil : {user.pseudo ?? user.phone}
          </Link>
          <Button variant="quiet" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      )}
    </Page>
  );
}
