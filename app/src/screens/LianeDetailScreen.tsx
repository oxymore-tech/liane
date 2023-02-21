import { Liane } from "@/api";
import { ParamListBase } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LianeView } from "@/components/trip/LianeView";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { AppPressable } from "@/components/base/AppPressable";

export interface LianeDetailScreenParams extends ParamListBase {
  liane: Liane;
}

export const LianeDetailScreen = ({ route, navigation }: NativeStackScreenProps<LianeDetailScreenParams, "LianeDetail">) => {
  const liane: Liane = route.params!.liane;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <Row style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={defaultTextColor(AppColors.yellow)} />
        </Pressable>
        <AppText style={styles.title}>Détails de la Liane</AppText>
      </Row>
      <View style={styles.section}>
        <LianeView liane={liane} />
      </View>
      <View style={styles.separator} />
      <Column style={styles.tagsContainer} spacing={8}>
        <Row
          style={[
            styles.tag,
            {
              backgroundColor: AppColorPalettes.yellow[200]
            }
          ]}
          spacing={8}>
          <AppIcon name={"calendar-outline"} />
          <AppText style={{ fontSize: 16 }}>
            {`${formatMonthDay(new Date(liane.departureTime))} à ${formatTime(new Date(liane.departureTime))}`}
          </AppText>
        </Row>
        <Row
          style={[
            styles.tag,
            {
              backgroundColor: AppColorPalettes.gray[200]
            }
          ]}
          spacing={8}>
          <AppIcon name={"people-outline"} />
          <AppText style={{ fontSize: 16 }}>{liane.members.length + " membre" + (liane.members.length > 1 ? "s" : "")}</AppText>
        </Row>
      </Column>
      <View style={styles.separator} />
      <Row style={[styles.section, { alignItems: "center" }]} spacing={16}>
        <View
          style={{ backgroundColor: liane.driver ? ContextualColors.greenValid.bg : ContextualColors.redAlert.bg, padding: 12, borderRadius: 52 }}>
          <AppCustomIcon name={liane.driver ? "car-check-mark" : "car-strike-through"} size={36} />
        </View>
        <AppText style={{ fontSize: 18 }}>{liane.driver ? "John Doe" : "Aucun conducteur"} </AppText>
      </Row>
      <View style={styles.separator} />

      <Column spacing={8} style={styles.actionsContainer}>
        <AppPressable backgroundStyle={styles.rowActionContainer} onPress={() => navigation.navigate("Chat")}>
          <Row style={{ alignItems: "center", padding: 16 }} spacing={8}>
            <AppIcon name={"message-circle-outline"} />
            <AppText style={{ fontSize: 16 }}>Aller à la conversation</AppText>
            <View style={{ flexGrow: 1, alignItems: "flex-end" }}>
              <AppIcon name={"arrow-ios-forward-outline"} />
            </View>
          </Row>
        </AppPressable>
      </Column>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: AppColors.white
  },
  title: {
    color: defaultTextColor(AppColors.yellow),
    fontSize: 20,
    textAlignVertical: "center",
    fontWeight: "500"
  },
  section: { paddingVertical: 16, marginHorizontal: 24 },
  actionsContainer: {
    marginVertical: 8,
    marginHorizontal: 24
  },
  rowActionContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center"
  },
  tagsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "flex-start"
  },
  headerContainer: {
    backgroundColor: AppColors.yellow,
    paddingVertical: 12,
    alignItems: "center"
  },
  separator: {
    marginHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColorPalettes.gray[200],
    marginBottom: 4
  }
});
