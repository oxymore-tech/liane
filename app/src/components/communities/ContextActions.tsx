import { CoLiane, CoMatch } from "@liane/common";
import { StyleSheet } from "react-native";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { Column, Row } from "@/components/base/AppLayout.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppAvatar } from "@/components/UserPicture.tsx";

export type ContextActionsProps = {
  matchOrLiane: CoLiane | CoMatch;
  onJoin: () => void;
  onReject: () => void;
  onLeave: () => void;
  pendingAction?: PendingAction;
};

export type PendingAction = "join" | "reject" | "leave";

export const ContextActions = ({ matchOrLiane, onJoin, onReject, onLeave, pendingAction }: ContextActionsProps) => {
  if (isLiane(matchOrLiane)) {
    return <LianeContextActions liane={matchOrLiane} onJoin={onJoin} onReject={onReject} onLeave={onLeave} pendingAction={pendingAction} />;
  }

  return <MatchContextActions match={matchOrLiane} onJoin={onJoin} onReject={onReject} pendingAction={pendingAction} />;
};

export type LianeContextActionsProps = {
  liane: CoLiane;
  onJoin: () => void;
  onReject: () => void;
  onLeave: () => void;
  pendingAction?: PendingAction;
};

export const LianeContextActions = ({ liane, onJoin, onReject, pendingAction }: LianeContextActionsProps) => {
  const { user } = useContext(AppContext);

  if (liane.members.find(m => m.user.id === user?.id)) {
    return (
      <Column style={styles.columnAlignment}>
        <AppText style={styles.headerText}>
          {liane.pendingMembers.length > 0 ? `Demande${liane.pendingMembers.length > 1 ? "s" : ""} en cours` : "Vous êtes membre de cette liane"}
        </AppText>
        <Column style={styles.subColumn}>
          {liane.pendingMembers.map(m => (
            <Row
              key={m.user.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 5
              }}>
              <AppAvatar user={m.user} />
              <AppText
                style={{
                  fontSize: 17,
                  fontWeight: "bold",
                  marginLeft: 5,
                  marginRight: 15
                }}>
                {m.user.pseudo}
              </AppText>
              <AppButton
                style={{ marginRight: 5 }}
                onPress={onJoin}
                color={AppColors.primaryColor}
                value="Accepter"
                loading={pendingAction === "join"}
              />
              <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Refuser" loading={pendingAction === "reject"} />
            </Row>
          ))}
        </Column>
      </Column>
    );
  }

  if (liane.pendingMembers.find(m => m.user.id === user?.id)) {
    return (
      <Column style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{"Vous avez demander à rejoindre cette liane"}</AppText>
        <Row style={styles.subColumn}>
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Annuler ma demande" loading={pendingAction === "reject"} />
        </Row>
      </Column>
    );
  }

  return (
    <Column style={styles.columnAlignment}>
      <AppText style={styles.headerText}>{`Voulez-vous rejoindre cette liane ?`}</AppText>
      <Row style={styles.subColumn}>
        <AppButton onPress={onJoin} color={AppColors.primaryColor} value="Rejoindre" loading={pendingAction === "join"} />
      </Row>
    </Column>
  );
};

export type MatchContextActionsProps = {
  match: CoMatch;
  onJoin: () => void;
  onReject: () => void;
  pendingAction?: PendingAction;
};

export const MatchContextActions = ({ match, onJoin, onReject, pendingAction }: MatchContextActionsProps) => {
  if ((match.type === "Single" && match.joinRequest?.type === "Pending") || (match.type === "Group" && match.pendingRequest)) {
    return (
      <Column style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{"Vous avez demander à rejoindre cette liane"}</AppText>
        <Row style={styles.subColumn}>
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Annuler ma demande" loading={pendingAction === "reject"} />
        </Row>
      </Column>
    );
  }

  if (match.type === "Single" && match.joinRequest?.type === "Received") {
    return (
      <Column style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{`${match.members[0].pseudo} souhaite vous rejoindre pour créer une liane`}</AppText>
        <Row style={styles.subColumn}>
          <AppButton onPress={onJoin} color={AppColors.primaryColor} value="Accepter" loading={pendingAction === "join"} />
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Refuser" loading={pendingAction === "reject"} />
        </Row>
      </Column>
    );
  }

  if (match.type === "Group" && match.pendingRequest) {
    return (
      <Column style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{"Vous avez demander à rejoindre cette liane"}</AppText>
        <Row style={styles.subColumn}>
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Annuler ma demande" loading={pendingAction === "reject"} />
        </Row>
      </Column>
    );
  }

  return (
    <Column style={styles.columnAlignment}>
      <AppText style={styles.headerText}>{`Voulez-vous rejoindre cette liane ?`}</AppText>
      <Row style={styles.subColumn}>
        <AppButton onPress={onJoin} color={AppColors.primaryColor} value="Rejoindre" loading={pendingAction === "join"} />
      </Row>
    </Column>
  );
};

function isLiane(l: CoLiane | CoMatch): l is CoLiane {
  return (l as any).wayPoints;
}

const styles = StyleSheet.create({
  headerText: {
    color: AppColorPalettes.gray[800],
    fontSize: 16,
    textAlign: "center"
  },
  columnAlignment: { flexDirection: "column", justifyContent: "center", alignItems: "center" },
  subColumn: {
    marginVertical: 13
  }
});
