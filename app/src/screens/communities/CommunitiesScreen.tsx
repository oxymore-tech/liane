import React, { useContext } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery } from "react-query";
import { UnauthorizedError } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { Column } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { LianeListView } from "@/components/communities/LianeListView";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DefaultFloatingActions } from "@/components/context/FloatingActions.tsx";

export const CommunitiesScreen = () => {
  const insets = useSafeAreaInsets();
  const { services } = useContext(AppContext);

  const lianeMatches = useQuery(CoLianeMatchQueryKey, () => services.community.match());

  const { isFetching, error, data } = lianeMatches;

  if (lianeMatches.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
      </View>
    );
  }

  if (error) {
    // Show content depending on the error or propagate it
    if (error instanceof UnauthorizedError) {
      throw error;
    } else {
      return (
        <View style={styles.container}>
          <Column style={[AppStyles.center, AppStyles.fullHeight]}>
            <AppText style={AppStyles.errorData}>Une erreur est survenue.</AppText>
            <AppText style={AppStyles.errorData}>Message: {(error as any).message}</AppText>
            <View style={{ marginTop: 12 }}>
              <AppButton color={AppColors.primaryColor} value="Réessayer" icon="refresh-outline" onPress={() => lianeMatches.refetch()} />
            </View>
          </Column>
        </View>
      );
    }
  }

  const list = data ?? [];
  return (
    <Column style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <LianeListView data={list} isFetching={isFetching} onRefresh={() => lianeMatches.refetch()} />
      <DefaultFloatingActions actions={["add"]} />
    </Column>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    backgroundColor: AppColors.lightGrayBackground,
    zIndex: 3,
    flex: 1
  },
  container: {
    marginHorizontal: 16,
    flex: 1
  }
});

export const CoLianeMatchQueryKey = "liane/match";
