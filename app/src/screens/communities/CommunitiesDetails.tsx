import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { UserPicture } from "@/components/UserPicture";
import { AppColors, ContextualColors } from "@/theme/colors";
import { SimpleModal } from "@/components/modal/SimpleModal";
import { Logger } from "@maplibre/maplibre-react-native";
import { AppLogger } from "@/api/logger";

const members = [
  {
    id: "1",
    name: "Moi",
    location: "Mende → Ispagnac",
    time: "Lun, Mar. 10h",
    isMe: true
  },
  {
    id: "2",
    name: "Jacques N.",
    location: "Mende → Ispagnac",
    time: "Lun, Mar. 10h",
    isMe: false
  },
  {
    id: "3",
    name: "Samuel T.",
    location: "Mende → Balsièges",
    time: "Lun, Mar. 10h",
    isMe: false
  }
];

export const CommunitiesDetails = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesDetails">();
  const group = route.params.group;
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [myModalVisible, setMyModalVisible] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentMember, setCurrentMember] = useState<any>(null);

  const MemberItem = ({ member }: any) => (
    <View style={styles.memberContainer}>
      <View style={styles.memberInfo}>
        <View style={styles.avatarContainer}>
          <UserPicture key={member.id} size={50} url={null} id={member.image} />
        </View>
        <View style={styles.textContainer}>
          <AppText style={styles.nameText}>{member.name}</AppText>
          <AppText style={styles.locationText}>{member.location}</AppText>
          <AppText style={styles.timeText}>{member.time}</AppText>
        </View>
      </View>
      <Pressable onPress={() => (member.isMe ? setMyModalVisible(true) : openModalUser(member))}>
        <AppIcon name={"more-vertical"} />
      </Pressable>
    </View>
  );

  const openModalUser = (user: any) => {
    setModalVisible(true);
    setCurrentMember(user);
  };

  const closeModalUser = () => {
    setModalVisible(false);
    setCurrentMember(null);
  };

  const reportUser = () => {
    AppLogger.debug("COMMUNITIES", "Report user", currentMember);
    closeModalUser();
    // TODO report user
  };

  const leaveLiane = () => {
    AppLogger.debug("COMMUNITIES", "Leave Liane", currentMember);
    setMyModalVisible(false);
    // TODO service quitter Liane
  };

  const changeParams = () => {
    AppLogger.debug("COMMUNITIES", "Change params", currentMember);
    setMyModalVisible(false);
    // TODO service ouvrir la fenêtre de changement des params
  };

  return (
    <View style={styles.mainContainer}>
      {error && (
        <Center style={{ flex: 1 }}>
          <AppText style={{ color: ContextualColors.redAlert.text }}>{error.message}</AppText>
        </Center>
      )}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: "row", width: "100%" }}>
            <AppPressableIcon onPress={() => navigation.goBack()} name={"arrow-ios-back-outline"} color={AppColors.white} size={32} />
          </View>
          <AppText style={styles.groupName}>{group.nomGroupe}</AppText>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={styles.iconContainer}>
                <AppIcon name={"book"} size={72} />
                <AppText style={styles.iconText}>500</AppText>
              </View>
              <AppText style={styles.labelText}>km effectués</AppText>
            </View>
            <View style={styles.statBox}>
              <View style={styles.iconContainer}>
                <AppIcon name={"cloud"} size={72} />
                <AppText style={styles.iconText}>50</AppText>
              </View>
              <AppText style={styles.labelText}>kg de CO2 économisés</AppText>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.membersContainer}>
        <AppText style={styles.membersTitle}>Membres ({group.covoitureurs.length})</AppText>
        <FlatList data={members} renderItem={({ item }) => <MemberItem member={item} />} keyExtractor={item => item.id} />
      </View>
      <SimpleModal visible={myModalVisible} setVisible={setMyModalVisible} backgroundColor={AppColors.white} hideClose>
        <Column>
          <Pressable style={{ marginHorizontal: 16, marginBottom: 10, flexDirection: "row" }} onPress={changeParams}>
            <AppIcon name={"swap"} />
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24 }}>Modifier mes contraintes</AppText>
          </Pressable>
          <Pressable style={{ margin: 16, flexDirection: "row" }} onPress={leaveLiane}>
            <AppIcon color={AppColors.primaryColor} name={"log-out"} />
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.primaryColor }}>
              Quitter la liane
            </AppText>
          </Pressable>
        </Column>
      </SimpleModal>
      <SimpleModal visible={modalVisible} setVisible={closeModalUser} backgroundColor={AppColors.white} hideClose>
        <Column>
          <Pressable style={{ flexDirection: "row", marginHorizontal: 16 }} onPress={reportUser}>
            <AppIcon name={"info"} />
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24 }}>Signaler l'utilisateur</AppText>
          </Pressable>
        </Column>
      </SimpleModal>
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
  errorText: {
    color: ContextualColors.redAlert.text
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
  groupName: {
    fontSize: 24,
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 27,
    textAlign: "center",
    color: AppColors.white
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
    fontWeight: "600",
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
    fontWeight: "600",
    lineHeight: 24
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 27,
    color: AppColors.black
  },
  timeText: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16,
    color: AppColors.black
  }
});
