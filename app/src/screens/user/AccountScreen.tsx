import React, { useContext } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";
import { AppLocalization } from "@/api/i18n";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon } from "@/components/base/AppIcon";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { AppText } from "@/components/base/AppText";
import { Center, Column } from "@/components/base/AppLayout";
import { UserPicture } from "@/components/UserPicture";
import { AppColors, ContextualColors } from "@/theme/colors";
import { capitalize } from "@liane/common";
import { LineSeparator } from "@/components/Separator";
import { ActionListItem } from "@/components/ActionItem";

export const AccountScreen = () => {
  const { navigation } = useAppNavigation();
  const { services, user, logout } = useContext(AppContext);
  return (
    <>
      <AppStatusBar style="light-content" />
      <ScrollView overScrollMode="never">
        <Center style={[styles.infoContainer, { paddingTop: 24 }]}>
          <Pressable style={[styles.backContainer, { top: 24 }]} onPress={navigation.goBack}>
            <AppIcon name={"arrow-ios-back-outline"} color={AppColors.white} />
          </Pressable>
          <UserPicture size={180} url={user!.pictureUrl} id={user!.id} />
        </Center>

        <Column spacing={4} style={{ marginVertical: 24, marginHorizontal: 24 }}>
          <AppText style={styles.userDateContainer}>Membre depuis {capitalize(AppLocalization.formatMonthYear(new Date(user!.createdAt!)))}</AppText>
          <AppText style={styles.userDateContainer}>{user!.phone}</AppText>
        </Column>

        <LineSeparator />
        <ActionListItem onPress={() => navigation.navigate("ProfileEdit")} iconName={"edit-outline"} text={"Mes informations"} />
        <ActionListItem
          onPress={() => {
            Alert.alert("Supprimer définitivement ce compte ?", "Toutes les données liées seront supprimées.", [
              {
                text: "Annuler",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Confirmer",
                onPress: async () => {
                  await services.auth.deleteAccount();
                  logout();
                },
                style: "default"
              }
            ]);
          }}
          color={ContextualColors.redAlert.text}
          iconName={"trash-outline"}
          text={"Supprimer ce compte"}
        />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  infoContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: AppColors.secondaryColor
  },
  backContainer: {
    position: "absolute",
    left: 24
  },
  userDateContainer: {
    color: "black",
    fontSize: 14
  }
});
