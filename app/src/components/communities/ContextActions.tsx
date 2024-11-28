import { CoLiane, CoMatch, ResolvedLianeRequest } from "@liane/common";
import { StyleSheet } from "react-native";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { Center, Row } from "@/components/base/AppLayout.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppAvatar } from "@/components/UserPicture.tsx";

export type ContextActionsProps = {
  matchOrLiane: CoLiane | CoMatch;
  lianeRequest?: ResolvedLianeRequest | CoLiane;
  onJoin: () => void;
  onReject: () => void;
  onLeave: () => void;
  pendingAction?: PendingAction;
};

export type PendingAction = "join" | "reject" | "leave";

export const ContextActions = ({ matchOrLiane, lianeRequest, onJoin, onReject, onLeave, pendingAction }: ContextActionsProps) => {
  if (isLiane(matchOrLiane)) {
    return (
      <LianeContextActions
        liane={matchOrLiane}
        lianeRequest={lianeRequest}
        onJoin={onJoin}
        onReject={onReject}
        onLeave={onLeave}
        pendingAction={pendingAction}
      />
    );
  }

  return <MatchContextActions match={matchOrLiane} onJoin={onJoin} onReject={onReject} pendingAction={pendingAction} />;
};

export type LianeContextActionsProps = {
  liane: CoLiane;
  lianeRequest?: ResolvedLianeRequest | CoLiane;
  onJoin: () => void;
  onReject: () => void;
  onLeave: () => void;
  pendingAction?: PendingAction;
};

export const LianeContextActions = ({ liane, lianeRequest, onJoin, onReject, pendingAction }: LianeContextActionsProps) => {
  const { user } = useContext(AppContext);

  if (liane.members.find(m => m.user.id === user?.id)) {
    const pendingMember = liane.pendingMembers.find(m => m.user.id === lianeRequest?.createdBy.id);

    if (!pendingMember) {
      return (
        <Center style={styles.columnAlignment}>
          <AppText style={styles.headerText}>{"Vous êtes membre de cette liane"}</AppText>
          <Row>
            <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Quitter" loading={pendingAction === "leave"} />
          </Row>
        </Center>
      );
    }

    return (
      <Row style={styles.columnAlignment}>
        <Center>
          <AppAvatar user={pendingMember.user} size={40} />
        </Center>
        <Center>
          <Row>
            <AppText style={[styles.headerText, { marginLeft: 8, fontWeight: "bold" }]}>{pendingMember.user.pseudo}</AppText>
            <AppText style={[styles.headerText, { marginLeft: 8 }]}>{"souhaite rejoindre la liane"}</AppText>
          </Row>
          <Row spacing={5}>
            <AppButton onPress={onJoin} color={AppColors.primaryColor} value="Accepter" loading={pendingAction === "join"} />
            <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Refuser" loading={pendingAction === "reject"} />
          </Row>
        </Center>
      </Row>
    );
  }

  if (liane.pendingMembers.find(m => m.user.id === user?.id)) {
    return (
      <Center style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{"Vous avez demandé à rejoindre cette liane"}</AppText>
        <Row>
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Annuler ma demande" loading={pendingAction === "reject"} />
        </Row>
      </Center>
    );
  }

  return (
    <Center style={styles.columnAlignment}>
      <AppText style={styles.headerText}>{`Voulez-vous rejoindre cette liane ?`}</AppText>
      <Row>
        <AppButton onPress={onJoin} color={AppColors.primaryColor} value="Rejoindre" loading={pendingAction === "join"} />
      </Row>
    </Center>
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
      <Center style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{"Vous avez demandé à rejoindre cette liane"}</AppText>
        <Row>
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Annuler ma demande" loading={pendingAction === "reject"} />
        </Row>
      </Center>
    );
  }

  if (match.type === "Single" && match.joinRequest?.type === "Received") {
    return (
      <Center style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{`${match.members[0].pseudo} souhaite rejoindre votre liane`}</AppText>
        <Row spacing={5}>
          <AppButton onPress={onJoin} color={AppColors.primaryColor} value="Accepter" loading={pendingAction === "join"} />
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Refuser" loading={pendingAction === "reject"} />
        </Row>
      </Center>
    );
  }

  if (match.type === "Group" && match.pendingRequest) {
    return (
      <Center style={styles.columnAlignment}>
        <AppText style={styles.headerText}>{"Vous avez demandé à rejoindre cette liane"}</AppText>
        <Row>
          <AppButton onPress={onReject} color={AppColors.secondaryColor} value="Annuler ma demande" loading={pendingAction === "reject"} />
        </Row>
      </Center>
    );
  }

  return (
    <Center style={styles.columnAlignment}>
      <AppText style={styles.headerText}>{`Voulez-vous rejoindre cette liane ?`}</AppText>
      <Row>
        <AppButton onPress={onJoin} color={AppColors.primaryColor} value="Rejoindre" loading={pendingAction === "join"} />
      </Row>
    </Center>
  );
};

function isLiane(l: CoLiane | CoMatch): l is CoLiane {
  return (l as any).wayPoints;
}

const styles = StyleSheet.create({
  headerText: {
    color: AppColorPalettes.gray[800],
    fontSize: 16,
    textAlign: "center",
    marginVertical: 8
  },
  columnAlignment: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.white
  }
});
