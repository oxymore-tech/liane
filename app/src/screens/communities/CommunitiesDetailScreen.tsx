import React, { useCallback, useContext, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppIcon } from "@/components/base/AppIcon";
import { UserPicture } from "@/components/UserPicture";
import { AppColors } from "@/theme/colors";
import { SimpleModal } from "@/components/modal/SimpleModal";
import { AppLogger } from "@/api/logger";
import { CoLianeMember, FullUser } from "@liane/common";
import { extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { AppContext } from "@/components/context/ContextProvider";
import { AppButton } from "@/components/base/AppButton.tsx";
import { extractDays, extractTime } from "@/util/hooks/days.ts";
import { useQueryClient } from "react-query";
import { LianeQueryKey } from "@/util/hooks/query.ts";
import { ModalLianeRequestItem } from "@/components/communities/ModalLianeRequestItemView.tsx";

export const CommunitiesDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesDetails">();
  const { user } = useContext(AppContext);
  const queryClient = useQueryClient();
  const liane = route.params.liane;

  const [myModalVisible, setMyModalVisible] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const closeModalUser = () => {
    setModalVisible(false);
  };

  const reportUser = () => {
    AppLogger.debug("COMMUNITIES", "Report user");
    closeModalUser();
  };

  const myLianeRequest = useMemo(() => {
    if (!liane) {
      return undefined;
    }
    const lianeMember = liane.members.find(member => member.user?.id === user?.id);
    return lianeMember?.lianeRequest;
  }, [liane, user?.id]);

  const members = useMemo(() => {
    // move current user on top
    const currentUserId = user?.id;
    if (!currentUserId) {
      return liane.members;
    }
    const currentUserIndex = liane.members.findIndex(member => member.user?.id === currentUserId);
    if (currentUserIndex === -1) {
      return liane.members;
    }
    const currentUser = liane.members[currentUserIndex];
    const newMembers = [...liane.members];
    newMembers.splice(currentUserIndex, 1);
    newMembers.unshift(currentUser);
    return newMembers;
  }, [liane.members, user?.id]);

  const handleRefresh = useCallback(
    async (deleted: boolean) => {
      await queryClient.invalidateQueries(LianeQueryKey);
      if (deleted) {
        navigation.popToTop();
      }
    },
    [navigation, queryClient]
  );

  return (
    <View>
      <View>
        <View style={styles.header}>
          <Row>
            <AppButton onPress={() => navigation.goBack()} icon="arrow-left" color={AppColors.white} />
          </Row>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={styles.iconContainer}>
                <AppIcon name="book" size={72} />
                <AppText style={styles.iconText}>500</AppText>
              </View>
              <AppText style={styles.labelText}>km effectués</AppText>
            </View>
            <View style={styles.statBox}>
              <View style={styles.iconContainer}>
                <AppIcon name="cloud" size={72} />
                <AppText style={styles.iconText}>50</AppText>
              </View>
              <AppText style={styles.labelText}>kg de CO2 économisés</AppText>
            </View>
          </View>
        </View>
        <View style={styles.membersContainer}>
          <AppText style={styles.membersTitle}>Membres ({liane.members.length})</AppText>
          <FlatList
            data={members}
            renderItem={({ item }) => (
              <MemberItem member={item} user={user} setMyModalVisible={setMyModalVisible} setModalVisible={setModalVisible} />
            )}
            keyExtractor={item => item.user?.id || "id"}
          />
        </View>
      </View>
      <ModalLianeRequestItem
        lianeRequest={myLianeRequest}
        attached={true}
        onRefresh={handleRefresh}
        myModalVisible={myModalVisible}
        setMyModalVisible={setMyModalVisible}
      />
      <SimpleModal visible={modalVisible} setVisible={closeModalUser} backgroundColor={AppColors.white} hideClose>
        <Column>
          <Pressable style={{ flexDirection: "row", marginHorizontal: 16 }} onPress={reportUser}>
            <AppIcon name="info" />
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24 }}>Signaler l'utilisateur</AppText>
          </Pressable>
        </Column>
      </SimpleModal>
    </View>
  );
};

type MemberItemProps = {
  member: CoLianeMember;
  user?: FullUser;
  setMyModalVisible: (visible: boolean) => void;
  setModalVisible: (visible: boolean) => void;
};

const MemberItem = ({ member, user, setMyModalVisible, setModalVisible }: MemberItemProps) => {
  const { to, from } = useMemo(() => extractWaypointFromTo(member.lianeRequest.wayPoints), [member.lianeRequest]);

  return (
    <View style={styles.memberContainer}>
      <View style={styles.memberInfo}>
        <View style={styles.avatarContainer}>
          <UserPicture key={member.user?.id} size={50} url={member.user?.pictureUrl} id={member.user?.id} />
        </View>
        <View style={styles.textContainer}>
          <AppText style={styles.nameText}>{member.user?.pseudo}</AppText>
          <Column>
            <AppText style={styles.locationText}>{from.city}</AppText>
            <AppText style={styles.locationText}>{to.city}</AppText>
          </Column>
          <AppText style={styles.timeText}>{extractTime({ start: member.lianeRequest.arriveBefore, end: member.lianeRequest.returnAfter })}</AppText>
          <AppText style={styles.timeText}>{extractDays(member.lianeRequest.weekDays)}</AppText>
        </View>
      </View>
      <Pressable onPress={() => (member.user?.id === user?.id ? setMyModalVisible(true) : setModalVisible(true))}>
        <AppIcon name={member.user?.id === user?.id ? "edit" : "more-vertical"} size={30} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: AppColors.primaryColor,
    padding: 16,
    gap: 16,
    marginBottom: 10
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  statBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primaryColor,
    borderRadius: 10,
    padding: 10,
    width: "45%",
    borderWidth: 2,
    borderColor: AppColors.white
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 8,
    width: 64,
    height: 64
  },
  iconText: {
    position: "absolute",
    color: AppColors.black,
    fontWeight: "bold",
    fontSize: 18
  },
  labelText: {
    fontSize: 14,
    color: AppColors.white,
    textAlign: "center"
  },
  membersContainer: {
    marginLeft: 15
  },
  membersTitle: {
    marginLeft: 5,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1,
    lineHeight: 24
  },
  memberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  avatarContainer: {
    marginRight: 16
  },
  textContainer: {
    flex: 1
  },
  nameText: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 24
  },
  locationText: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.black
  },
  timeText: {
    fontSize: 14,
    fontWeight: "normal",
    color: AppColors.black
  }
});
