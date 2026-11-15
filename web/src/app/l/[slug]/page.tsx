"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getLiane, leaveLiane } from "@/api/lianes";
import { useAppContext } from "@/components/context-provider";
import { JoinForm } from "@/components/liane/join-form";
import { daysLabel, sectionLabel } from "@/components/liane/labels";
import {
  MemberCount,
  ScheduleTable,
  StopList,
} from "@/components/liane/liane-summary";
import { MemberList } from "@/components/liane/member-list";
import { Button, Card, Page } from "@/components/ui";

const RoutePreview = dynamic(() => import("@/components/map/route-preview"), {
  ssr: false,
});

function LianePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const wantsToJoin = useSearchParams().get("rejoindre") === "1";
  const queryClient = useQueryClient();
  const { user, loading: userLoading } = useAppContext();
  const [formOpen, setFormOpen] = useState(false);

  const {
    data: liane,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["liane", slug, user?.id ?? null],
    queryFn: () => getLiane(slug),
    enabled: !userLoading,
  });

  const loginUrl = `/connexion?retour=${encodeURIComponent(`/l/${slug}?rejoindre=1`)}`;
  const isMember = Boolean(liane?.membership);

  useEffect(() => {
    if (!wantsToJoin || !liane || liane.membership || !liane.is_active) return;
    if (user) {
      setFormOpen(true);
    } else {
      router.replace(loginUrl);
    }
  }, [wantsToJoin, user, liane, router, loginUrl]);

  const refresh = async () => {
    setFormOpen(false);
    router.replace(`/l/${slug}`);
    await queryClient.invalidateQueries({ queryKey: ["lianes"] });
    await refetch();
  };

  const leave = async () => {
    if (!liane || !window.confirm(`Quitter la liane « ${liane.name} » ?`))
      return;
    await leaveLiane(liane.id);
    await refresh();
  };

  if (isError) {
    return (
      <Page title="Liane introuvable">
        <Card>Cette liane n'existe pas ou n'est plus proposée.</Card>
      </Page>
    );
  }
  if (!liane) {
    return (
      <Page title="Liane">
        <p className="text-gray-500">Chargement…</p>
      </Page>
    );
  }

  return (
    <Page title={liane.name}>
      <div className="h-48 overflow-hidden rounded-xl border border-gray-200">
        <RoutePreview stops={liane.stops} route={liane.route?.coordinates} />
      </div>

      <Card>
        <h2 className="text-xl font-bold">{liane.name}</h2>
        <MemberCount liane={liane} />
        {!liane.is_active && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Cette liane est désactivée : elle n'apparaît plus sur la carte.
          </p>
        )}

        {liane.membership && !formOpen && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2">
            <p className="font-semibold text-emerald-900">
              Vous êtes membre de cette liane
            </p>
            <p className="text-sm text-emerald-900">
              {sectionLabel(liane, liane.membership)} ·{" "}
              {daysLabel(liane.membership.week_days)}
              {liane.membership.can_drive && " · vous pouvez conduire"}
            </p>
            <div className="mt-2 flex gap-3">
              <Button variant="secondary" onClick={() => setFormOpen(true)}>
                Modifier
              </Button>
              <Button variant="danger" onClick={leave}>
                Quitter la liane
              </Button>
            </div>
          </div>
        )}

        {!isMember && !formOpen && liane.is_active && (
          <Button
            className="mt-3 w-full"
            onClick={() => (user ? setFormOpen(true) : router.push(loginUrl))}
          >
            Rejoindre
          </Button>
        )}
        {!isMember && !formOpen && !user && liane.is_active && (
          <p className="mt-2 text-center text-sm text-gray-500">
            Il faut un compte pour rejoindre. C'est gratuit.
          </p>
        )}
      </Card>

      {formOpen && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">
            {isMember ? "Modifier mon trajet" : "Rejoindre la liane"}
          </h2>
          <JoinForm
            liane={liane}
            membership={liane.membership}
            onDone={refresh}
            onCancel={() => setFormOpen(false)}
          />
        </Card>
      )}

      <Card>
        <h2 className="mb-1 font-bold">Arrêts</h2>
        <StopList
          liane={liane}
          highlighted={
            liane.membership
              ? [
                  liane.membership.board_stop_id,
                  liane.membership.alight_stop_id,
                ]
              : []
          }
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-bold">Qui roule quand</h2>
        <ScheduleTable liane={liane} schedule={liane.schedule} />
      </Card>

      {liane.members && (
        <Card>
          <h2 className="mb-1 font-bold">Membres</h2>
          <MemberList
            liane={liane}
            members={liane.members}
            currentUserId={user?.id}
            canReport={isMember}
          />
        </Card>
      )}
    </Page>
  );
}

export default function Route() {
  return (
    <Suspense>
      <LianePage />
    </Suspense>
  );
}
