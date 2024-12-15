import { Linking, Pressable, ScrollView, StyleSheet } from "react-native";
import React, { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { APP_VERSION } from "@env";
import { Center, Column } from "@/components/base/AppLayout";
import { UserPicture } from "@/components/UserPicture";
import { AppIcon } from "@/components/base/AppIcon";
import { ActionListItem } from "@/components/ActionItem";
import { useAppNavigation } from "@/components/context/routing";
import { capitalize, FullUser, User } from "@liane/common";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { AppLocalization } from "@/api/i18n";
import { DebugIdView } from "@/components/base/DebugIdView";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { LineSeparator } from "@/components/Separator";
import { RNAppEnv } from "@/api/env";

export const ProfileScreen = () => {
  const { route } = useAppNavigation<"Profile">();
  const { user: loggedUser } = useContext(AppContext);
  const isMyPage = !route.params || route.params.user.id === loggedUser!.id;
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

  const isMyPage = user!.id === loggedUser!.id;
  const displayedUser = isMyPage ? loggedUser! : user;

  return (
    <ScrollView overScrollMode="never">
      <Center style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, backgroundColor: AppColors.secondaryColor }}>
        {!isMyPage && (
          <Pressable style={{ position: "absolute", left: 24, top: 24 }} onPress={navigation.goBack}>
            <AppIcon name="arrow-left" color={AppColors.white} />
          </Pressable>
        )}
        <UserPicture size={120} url={displayedUser.pictureUrl} id={displayedUser.id} />
        <Column style={{ marginVertical: 8, alignItems: "center" }}>
          <AppText style={styles.name}>{displayedUser.pseudo}</AppText>
        </Column>
      </Center>
      <Column spacing={4} style={{ marginVertical: 24, marginHorizontal: 24 }}>
        {/*<AppText style={styles.data}>4 trajets effectués</AppText>*/}
        <AppText style={styles.data}>Membre depuis {capitalize(AppLocalization.formatMonthYear(new Date(displayedUser.createdAt!)))}</AppText>
        {(displayedUser as FullUser).phone && <AppText style={styles.data}>{(displayedUser as FullUser).phone}</AppText>}
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
    <Column>
      {/*<ActionListItem onPress={() => {}} iconName={"bell-outline"} text={"Notifications"} />*/}
      <ActionListItem onPress={() => navigation.navigate("ArchivedTrips")} iconName="history" text="Historique des trajets" />
      <ActionListItem onPress={() => navigation.navigate("Settings")} iconName="settings" text="Paramètres" />
      <ActionListItem onPress={() => navigation.navigate("RallyingPointRequests")} iconName="pin" text="Proposer un point de ralliement" />

      <LineSeparator />
      <ActionListItem onPress={() => navigation.navigate("Account")} iconName="person" text="Compte" />
      <ActionListItem
        onPress={() => {
          Linking.openURL(`https://${RNAppEnv.host}/privacy-policy`);
        }}
        text="Politique de confidentialité"
        iconName="book"
      />
      <ActionListItem
        onPress={async () => {
          await services.auth.logout();
          logout();
        }}
        color={ContextualColors.redAlert.text}
        iconName="log-out"
        text="Se déconnecter"
      />
      <LineSeparator />
      <AppText style={{ marginLeft: 32, marginVertical: 8 }}>Version : {APP_VERSION}</AppText>
    </Column>
  );
};

const styles = StyleSheet.create({
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
