import React, { useContext, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ImagePickerResponse, launchImageLibrary } from "react-native-image-picker";
import { AppLocalization } from "@/api/i18n";
import { useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon } from "@/components/base/AppIcon";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { AppText } from "@/components/base/AppText";
import { AppTextInput } from "@/components/base/AppTextInput";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { UserPicture } from "@/components/UserPicture";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { capitalize } from "@liane/common";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export const ProfileEditScreen = () => {
  return (
    <>
      <AppStatusBar style="light-content" />
      <ProfileEditView />
    </>
  );
};

const ProfileEditView = () => {
  const { navigation } = useAppNavigation<"ProfileEdit">();
  const { services, user, refreshUser } = useContext(AppContext);
  const { top: insetsTop } = useSafeAreaInsets();

  const [firstName, setFirstName] = useState<string>(user!.firstName);
  const [lastName, setLastName] = useState<string>(user!.lastName);
  const [profilePicture, setProfilePicture] = useState<string | null | undefined>(user!.pictureUrl);

  const [isEditingUserName, setIsEditingUserName] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const updateUserPicture = async (uri: string, formData: FormData) => {
    setLoading(true);
    setProfilePicture(uri);
    await services.auth.uploadProfileImage(formData);
    await refreshUser();
    setLoading(false);
  };

  const saveUserName = async () => {
    setIsEditingUserName(false);

    // Send data only if one input is modified
    if (user!.firstName !== firstName || user!.lastName !== lastName) {
      const newUserData = {
        firstName: firstName,
        lastName: lastName,
        gender: user!.gender ?? "Unspecified",
        pictureUrl: user!.pictureUrl ?? ""
      };
      await services.auth.updateUserInfo(newUserData);
    }
  };

  return (
    <ScrollView overScrollMode="never">
      <Center style={[styles.infoContainer, { paddingTop: insetsTop + 24 }]}>
        <Pressable style={[styles.backContainer, { top: insetsTop + 24 }]} onPress={navigation.goBack}>
          <AppIcon name={"arrow-ios-back-outline"} color={AppColors.white} />
        </Pressable>
        <Pressable onPress={() => openGallery(updateUserPicture)}>
          <UserPicture size={180} url={profilePicture} id={user!.id} />
          {loading && (
            <Animated.View style={{ position: "absolute" }} entering={FadeIn} exiting={FadeOut}>
              <Center
                style={{
                  backgroundColor: "rgba(255,255,255,0.7)",
                  borderRadius: 180,
                  height: 180,
                  width: 180
                }}>
                <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
              </Center>
            </Animated.View>
          )}
          {!loading && (
            <Center
              style={{
                position: "absolute",
                borderRadius: 180,
                height: 180,
                width: 180
              }}>
              <AppIcon name={"edit-outline"} size={90} color={"rgba(255,255,255,0.6)"} />
            </Center>
          )}
        </Pressable>
      </Center>

      <Row style={styles.userNameContainer}>
        {isEditingUserName ? (
          <Column style={styles.userName}>
            <View style={[AppStyles.inputContainer, { marginBottom: 8 }]}>
              <AppTextInput placeholder="Prénom" onChangeText={setFirstName} style={[AppStyles.input, styles.userNameInput]}>
                {firstName}
              </AppTextInput>
            </View>
            <View style={AppStyles.inputContainer}>
              <AppTextInput placeholder="Nom" onChangeText={setLastName} style={[AppStyles.input, styles.userNameInput]}>
                {lastName}
              </AppTextInput>
            </View>
          </Column>
        ) : (
          <AppText style={styles.userName}>{`${firstName} ${lastName}`}</AppText>
        )}
        {isEditingUserName ? (
          <Pressable onPress={saveUserName}>
            <AppIcon name={"checkmark-outline"} color={AppColors.black} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setIsEditingUserName(true)}>
            <AppIcon name={"edit-outline"} color={AppColors.black} />
          </Pressable>
        )}
      </Row>

      <Column spacing={4} style={{ marginVertical: 24, marginHorizontal: 24 }}>
        <AppText style={styles.userDateContainer}>Membre depuis {capitalize(AppLocalization.formatMonthYear(new Date(user!.createdAt!)))}</AppText>
        <AppText style={styles.userDateContainer}>{user!.phone}</AppText>
      </Column>
    </ScrollView>
  );
};

const openGallery = async (onFileSelected: (uri: string, data: FormData) => void) => {
  await launchImageLibrary({ mediaType: "photo", includeBase64: true }, async (imageData: ImagePickerResponse) => {
    if (!imageData?.assets?.length) {
      return;
    }
    const asset = imageData?.assets[0];
    if (!asset.uri || !asset.type) {
      return;
    }
    const uri = Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", "");
    const formData = new FormData();
    // @ts-ignore
    formData.append("file", {
      name: asset.fileName ?? "image",
      type: asset.type,
      uri
    });
    onFileSelected(uri, formData);
  });
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
  userNameContainer: {
    display: "flex",
    flexDirection: "row",
    paddingRight: 12,
    marginVertical: 8,
    alignItems: "center"
  },
  userName: {
    flex: 1,
    textAlign: "left",
    color: AppColors.black,
    fontWeight: "bold",
    fontSize: 24,
    paddingLeft: 24
  },
  userNameInput: {
    textAlign: "center",
    color: AppColors.black,
    fontWeight: "bold"
  },
  userDateContainer: {
    color: "black",
    fontSize: 14
  }
});
