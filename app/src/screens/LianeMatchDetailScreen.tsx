import { CompatibleMatch, LianeMatch } from "@/api";
import React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { LianeMatchView } from "@/components/trip/LianeMatchView";
import { BottomOptionBg } from "@/components/vectors/BottomOptionBg";
import { AppButton } from "@/components/base/AppButton";
import { formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";

export const LianeMatchDetailScreen = () => {
  const { route, navigation } = useAppNavigation<"LianeMatchDetail">();
  const liane: LianeMatch = route.params!.lianeMatch;
  const insets = useSafeAreaInsets();
  const isExactMatch = liane.matchData.type === "ExactMatch";

  return (
    <View style={styles.page}>
      <Row style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={defaultTextColor(AppColors.yellow)} />
        </Pressable>
        <AppText style={styles.title}>Détails de la Liane</AppText>
      </Row>
      <View style={styles.section}>
        <LianeMatchView match={liane} filter={route.params!.filter} />
      </View>
      <View style={styles.separator} />
      <Column style={styles.tagsContainer} spacing={8}>
        <Row
          style={[
            styles.tag,
            {
              backgroundColor: AppColorPalettes.yellow[100]
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
          <AppText style={{ fontSize: 16 }}>
            {liane.freeSeatsCount + " " + ["place", "disponible"].map(word => word + (liane.freeSeatsCount > 1 ? "s" : "")).join(" ")}
          </AppText>
        </Row>
        {isExactMatch && (
          <Row spacing={8} style={[styles.tag, isExactMatch ? styles.exactMatchBg : styles.compatibleMatchBg]}>
            {isExactMatch ? <AppIcon name={"arrow-upward-outline"} /> : <AppCustomIcon name={"twisting-arrow"} size={20} />}
            <AppText style={{ fontSize: 16 }}>{isExactMatch ? "Trajet exact" : "Trajet compatible"}</AppText>
          </Row>
        )}
        {!isExactMatch && (
          <AppText>Ce trajet fait faire un détour de {formatDuration((liane.matchData as CompatibleMatch).deltaInSeconds)} à John Doe</AppText>
        )}
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

      <BottomOptionBg color={AppColors.darkBlue}>
        <AppButton icon={"arrow-right"} title={"Rejoindre"} onPress={() => Alert.alert("Rejoindre cette Liane sera possible sous peu...")} />
      </BottomOptionBg>
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
  },
  exactMatchBg: {
    backgroundColor: ContextualColors.greenValid.bg
  },
  compatibleMatchBg: {
    backgroundColor: ContextualColors.orangeWarn.bg
  }
});
