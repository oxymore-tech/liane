import { Pressable, ScrollView, StyleSheet } from "react-native";
import React, { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { APP_VERSION } from "@env";
import { Center, Column } from "@/components/base/AppLayout";
import { UserPicture } from "@/components/UserPicture";
import { AppIcon } from "@/components/base/AppIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionItem } from "@/components/ActionItem";
import { LineSeparator } from "@/components/Separator";
import { useAppNavigation } from "@/api/navigation";
import { User } from "@/api";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { formatMonthYear } from "@/api/i18n";
import { capitalize } from "@/util/strings";
import { DebugIdView } from "@/components/base/DebugIdView";
import { AppStatusBar } from "@/components/base/AppStatusBar";

export const ProfileScreen = () => {
  const { route } = useAppNavigation<"Profile">();
  return (
    <>
      <AppStatusBar style="light-content" />
      <ProfileView params={route.params} />
    </>
  );
};

const ProfileView = WithFetchResource<User>(
  ({ data: user }) => {
    const { user: loggedUser } = useContext(AppContext);
    const { navigation } = useAppNavigation<"Profile">();

    const displayedUser = user || loggedUser!;
    const { top: insetsTop } = useSafeAreaInsets();
    const isMyPage = user!.id === loggedUser!.id;
    return (
      <ScrollView overScrollMode="never">
        <Center style={{ paddingHorizontal: 24, paddingTop: insetsTop + 24, paddingBottom: 12, backgroundColor: AppColors.darkBlue }}>
          <Pressable
            style={{ position: "absolute", left: 24, top: insetsTop + 24 }}
            onPress={() => {
              navigation.goBack();
            }}>
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
          <DebugIdView id={user.id!} />
        </Column>
        {isMyPage && <Actions />}
      </ScrollView>
    );
  },
  (_, params) => params.user,
  params => "GetUser" + params.user.id
);

const Actions = () => {
  const { services, setAuthUser } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  return (
    <Column>
      <ActionItem onPress={() => {}} iconName={"edit-outline"} text={"Mes informations"} />
      <ActionItem onPress={() => {}} iconName={"bell-outline"} text={"Notifications"} />
      <ActionItem
        onPress={() => {
          // @ts-ignore
          navigation.navigate("ArchivedTrips");
        }}
        iconName={"history"}
        text={"Historique des trajets"}
      />
      <ActionItem
        onPress={() => {
          navigation.navigate("Settings");
        }}
        iconName={"settings-outline"}
        text={"Paramètres"}
      />
      <LineSeparator />
      <ActionItem onPress={() => {}} text={"Conditions générales"} iconName={"book-open-outline"} />
      <ActionItem onPress={() => {}} text={"A propos"} iconName={"book-open-outline"} />

      <LineSeparator />
      <ActionItem
        onPress={() => {
          services.auth.logout().then(() => setAuthUser(undefined));
        }}
        color={ContextualColors.redAlert.text}
        iconName={"log-out-outline"}
        text={"Se déconnecter"}
      />

      <LineSeparator />
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
