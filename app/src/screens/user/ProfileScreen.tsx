import { Pressable, ScrollView, StyleSheet } from "react-native";
import React, { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { APP_VERSION } from "@env";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { UserPicture } from "@/components/UserPicture";
import { AppIcon } from "@/components/base/AppIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionItem } from "@/components/ActionItem";
import { useAppNavigation } from "@/api/navigation";
import { User } from "@/api";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { formatMonthYear } from "@/api/i18n";
import { capitalize } from "@/util/strings";
import { DebugIdView } from "@/components/base/DebugIdView";
import { AppStatusBar } from "@/components/base/AppStatusBar";

export const ProfileScreen = () => {
  const { route } = useAppNavigation<"Profile">();
  const { user: loggedUser } = useContext(AppContext);
  const isMyPage = route.params.user.id === loggedUser!.id;
  return (
    <>
      <AppStatusBar style="light-content" />
      {isMyPage ? <ProfileView user={loggedUser!} /> : <OtherUserProfileView params={route.params} />}
    </>
  );
};

const OtherUserProfileView = WithFetchResource<User>(
  ({ data: user }) => <ProfileView user={user} />,
  (_, params) => params.user,
  params => "GetUser" + params.user.id
);

const ProfileView = ({ user }: { user: User }) => {
  const { user: loggedUser } = useContext(AppContext);
  const { navigation } = useAppNavigation<"Profile">();

  const { top: insetsTop } = useSafeAreaInsets();
  const isMyPage = user!.id === loggedUser!.id;
  const displayedUser = isMyPage ? loggedUser! : user;

  return (
    <ScrollView overScrollMode="never">
      <Center style={{ paddingHorizontal: 24, paddingTop: insetsTop + 24, paddingBottom: 12, backgroundColor: AppColors.primaryColor }}>
        <Pressable style={{ position: "absolute", left: 24, top: insetsTop + 24 }} onPress={navigation.goBack}>
          <AppIcon name={"arrow-ios-back-outline"} color={AppColors.white} />
        </Pressable>
        <UserPicture size={120} url={displayedUser.pictureUrl} id={displayedUser.id} />
        <Column style={{ marginVertical: 8, alignItems: "center" }}>
          <AppText style={styles.name}>{displayedUser.pseudo}</AppText>
        </Column>
      </Center>
      <Column spacing={4} style={{ marginVertical: 24, marginHorizontal: 24 }}>
        {/*<AppText style={styles.data}>4 trajets effectués</AppText>*/}
        <AppText style={styles.data}>Membre depuis {capitalize(formatMonthYear(new Date(displayedUser.createdAt!)))}</AppText>
        {isMyPage && <AppText style={styles.data}>{displayedUser.phone}</AppText>}
        <DebugIdView object={user} />
      </Column>
      {isMyPage && <Actions />}
    </ScrollView>
  );
};

const Actions = () => {
  const { logout, services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  return (
    <Column style={{ alignItems: "center" }}>
      <Row>
        <ActionItem onPress={() => navigation.navigate("ProfileEdit")} iconName={"edit-outline"} text={"Mes informations"} />
        <ActionItem onPress={() => {}} iconName={"bell-outline"} text={"Notifications"} />
        <ActionItem onPress={() => navigation.navigate("ArchivedTrips")} iconName={"history"} text={"Historique des trajets"} />
      </Row>
      {/*<Row>
        <ActionItem onPress={() => {}} text={"Conditions générales"} iconName={"book-open-outline"} />
        <ActionItem onPress={() => {}} text={"A propos"} iconName={"book-open-outline"} />
      </Row>*/}
      <Row>
        <ActionItem onPress={() => navigation.navigate("Settings")} iconName={"settings-outline"} text={"Paramètres"} />
        <ActionItem onPress={() => navigation.navigate("Account")} iconName={"person-outline"} text={"Compte"} />
        <ActionItem
          onPress={async () => {
            await services.auth.logout();
            logout();
          }}
          color={ContextualColors.redAlert.text}
          iconName={"log-out-outline"}
          text={"Se déconnecter"}
        />
      </Row>
      <AppText style={{ marginLeft: 32, marginVertical: 8 }}>Version : {APP_VERSION}</AppText>
    </Column>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16
  },
  name: {
    color: "white",
    fontWeight: "bold",
    fontSize: 24
  },
  data: {
    color: "black",
    fontSize: 14
  }
});
