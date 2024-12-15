import React, { useContext, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Column } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { UserPicture } from "@/components/UserPicture";
import { AppColors } from "@/theme/colors";
import { SimpleModal } from "@/components/modal/SimpleModal";
import { AppLogger } from "@/api/logger";
import { CoLianeMember, FullUser } from "@liane/common";
import { extractDaysTimes, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { AppContext } from "@/components/context/ContextProvider";

export const CommunitiesDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesDetails">();
  const { services, user } = useContext(AppContext);
  const group = route.params.liane;
  const [myModalVisible, setMyModalVisible] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const closeModalUser = () => {
    setModalVisible(false);
  };

  const reportUser = () => {
    AppLogger.debug("COMMUNITIES", "Report user");
    closeModalUser();
  };

  const leaveLiane = async () => {
    setMyModalVisible(false);
    if (group && group.id) {
      try {
        const result = await services.community.leave(group.id);
        AppLogger.debug("COMMUNITIES", "Liane quittée avec succès", result);
        navigation.popToTop();
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Au moment de quitter la liane, une erreur c'est produite", e);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de liane ID lors de la tentative de départ de la liane", group);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: "row", width: "100%" }}>
            <AppPressableIcon onPress={() => navigation.goBack()} name="arrow-left" color={AppColors.white} size={32} />
          </View>
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
      </View>
      <View style={styles.membersContainer}>
        <AppText style={styles.membersTitle}>Membres ({group.members.length})</AppText>
        <FlatList
          data={group.members}
          renderItem={({ item }) => <MemberItem member={item} user={user} setMyModalVisible={setMyModalVisible} setModalVisible={setModalVisible} />}
          keyExtractor={item => item.user?.id || "id"}
        />
      </View>
      <SimpleModal visible={myModalVisible} setVisible={setMyModalVisible} backgroundColor={AppColors.white} hideClose>
        <Column>
          <Pressable
            style={{ marginHorizontal: 16, marginBottom: 10, flexDirection: "row" }}
            onPress={() => {
              setMyModalVisible(false);
              user &&
                navigation.navigate("Publish", {
                  initialValue: group.members.find(member => member.user?.id === user.id)?.lianeRequest
                });
            }}>
            <AppIcon name="swap" />
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24 }}>Modifier mes contraintes</AppText>
          </Pressable>
          <Pressable style={{ margin: 16, flexDirection: "row" }} onPress={leaveLiane}>
            <AppIcon color={AppColors.primaryColor} name="log-out" />
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.primaryColor }}>
              Quitter la liane
            </AppText>
          </Pressable>
        </Column>
      </SimpleModal>
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
          <AppText style={styles.locationText}>{`${from.label} ➔ ${to.label}`}</AppText>
          <AppText style={styles.timeText}>{extractDaysTimes(member.lianeRequest)}</AppText>
        </View>
      </View>
      <Pressable onPress={() => (member.user?.id === user?.id ? setMyModalVisible(true) : setModalVisible(true))}>
        <AppIcon name="more-vertical" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: AppColors.lightGrayBackground,
    justifyContent: "flex-start",
    flex: 1,
    height: "100%"
  },
  header: {
    backgroundColor: AppColors.primaryColor,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16
  },
  headerContent: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    width: "100%"
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    paddingTop: 16,
    backgroundColor: AppColors.primaryColor
  },
  statBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primaryColor,
    borderRadius: 10,
    padding: 10,
    margin: 5,
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
    marginTop: 340,
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
    marginTop: 10,
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
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 27,
    color: AppColors.black
  },
  timeText: {
    fontSize: 14,
    fontWeight: "normal",
    lineHeight: 16,
    color: AppColors.black
  }
});
