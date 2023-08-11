import React, { useContext, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary, ImagePickerResponse } from "react-native-image-picker";

import { FullUser, UserInfo } from "@/api";
import { formatMonthYear } from "@/api/i18n";
import { useAppNavigation } from "@/api/navigation";
import { AppServices } from "@/api/service";

import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon } from "@/components/base/AppIcon";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { AppText } from "@/components/base/AppText";
import { AppTextInput } from "@/components/base/AppTextInput";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { UserPicture } from "@/components/UserPicture";

import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { capitalize } from "@/util/strings";
import { getCurrentUser, storeCurrentUser } from "@/api/storage";

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
  const { services } = useContext(AppContext);
  const { top: insetsTop } = useSafeAreaInsets();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string | undefined>("");
  const [userInfos, setUserInfo] = useState<FullUser | undefined>(undefined);
  const [isEditingUserName, setIsEditingUserName] = useState<boolean>(false);

  useEffect(() => {
    services.auth.currentUser().then((user: FullUser | undefined) => {
      setUserInfo(user);
      setFirstName(user?.firstName ?? "");
      setLastName(user?.lastName ?? "");
      setProfilePicture(user?.pictureUrl ?? "");
    });
  }, []);

  return (
    <ScrollView overScrollMode="never">
      <Center style={[styles.infoContainer, { paddingTop: insetsTop + 24 }]}>
        <Pressable style={[styles.backContainer, { top: insetsTop + 24 }]} onPress={navigation.goBack}>
          <AppIcon name={"arrow-ios-back-outline"} color={AppColors.white} />
        </Pressable>
        <Pressable onPress={() => openGallery(setProfilePicture, setUserInfo, userInfos, firstName, lastName, profilePicture, services)}>
          <UserPicture size={180} url={profilePicture} id={userInfos?.id} />
        </Pressable>
      </Center>

      <Row style={styles.userNameContainer}>
        {isEditingUserName ? (
          <Column style={styles.userName}>
            <View style={[AppStyles.inputContainer, , { marginBottom: 8 }]}>
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
          <Pressable onPress={() => saveUserName(setIsEditingUserName, setUserInfo, userInfos, firstName, lastName, services)}>
            <AppIcon name={"checkmark-outline"} color={AppColors.black} />
          </Pressable>
        ) : (
          <Pressable onPress={() => editUserName(setIsEditingUserName)}>
            <AppIcon name={"edit-outline"} color={AppColors.black} />
          </Pressable>
        )}
      </Row>

      {userInfos ? (
        <Column spacing={4} style={{ marginVertical: 24, marginHorizontal: 24 }}>
          <AppText style={styles.userDateContainer}>Membre depuis {capitalize(formatMonthYear(new Date(userInfos?.createdAt!)))}</AppText>
          <AppText style={styles.userDateContainer}>{userInfos?.phone}</AppText>
        </Column>
      ) : null}
    </ScrollView>
  );
};

const editUserName = (setIsEditingUserName: (state: boolean) => void) => {
  setIsEditingUserName(true);
};

const saveUserName = (
  setIsEditingUserName: (state: boolean) => void,
  setUserInfo: (userInfo: FullUser | undefined) => void,
  userInfos: FullUser | undefined,
  firstName: string,
  lastName: string,
  services: AppServices
) => {
  setIsEditingUserName(false);

  // Send data only if one input is modified
  if (userInfos?.firstName !== firstName || userInfos?.lastName !== lastName) {
    const newFullUser = {
      firstName: firstName,
      lastName: lastName,
      gender: userInfos?.gender ?? "Unspecified",
      pictureUrl: userInfos?.pictureUrl ?? ""
    };
    services.auth.updateUserInfo(newFullUser);

    getCurrentUser().then((fullUser: FullUser | undefined) => {
      if (fullUser && newFullUser) {
        const updatedUserData = { ...fullUser, ...newFullUser, pseudo: `${newFullUser.firstName} ${newFullUser.lastName.charAt(0)}.` };
        storeCurrentUser(updatedUserData);
        setUserInfo(updatedUserData);
      }
    });
  }
};

const openGallery = (
  setProfilePicture: (uri: string | undefined) => void,
  setUserInfo: (userInfo: FullUser | undefined) => void,
  userInfos: FullUser | undefined,
  firstName: string,
  lastName: string,
  profilePicture: string | undefined,
  services: AppServices
) => {
  launchImageLibrary({ mediaType: "photo" }, (imageData: ImagePickerResponse) => {
    const newUri = imageData?.assets ? imageData?.assets[0]?.uri : "";
    const newFullUser = {
      firstName: firstName,
      lastName: lastName,
      gender: userInfos?.gender ?? "Unspecified",
      pictureUrl: newUri
    };

    // TODO: Upload image and get distant URI
    console.log(imageData);
    setProfilePicture(newUri);
    services.auth.updateUserInfo(newFullUser);

    getCurrentUser().then((fullUser: FullUser | undefined) => {
      if (fullUser && newFullUser) {
        const updatedUserData = { ...fullUser, ...newFullUser };
        storeCurrentUser(updatedUserData);
        setUserInfo(updatedUserData);
      }
    });
  });
};

const styles = StyleSheet.create({
  infoContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: AppColors.darkBlue
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
