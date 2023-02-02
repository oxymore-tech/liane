import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { Column, Row } from "@/components/base/AppLayout";
import { formatShortMonthDay, formatTime } from "@/api/i18n";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { CardButton } from "@/components/CardButton";
import { AppDimensions } from "@/theme/dimensions";
import WavingMonkey from "@/assets/waving_monkey.svg";
import { Liane } from "@/api";

// mock data
const liane: Liane = {
  departureTime: "2023-01-05T10:05:00Z",
  returnTime: "2023-01-05T15:20:00Z",
  wayPoints: [
    {
      rallyingPoint: {
        label: "Toulouse",
        location: {
          lat: 1.35,
          lng: 43.6
        }
      },
      duration: 0
    },

    {
      rallyingPoint: {
        label: "Muret",
        location: {
          lat: 1.28,
          lng: 43.44
        }
      },
      duration: 1860
    },
    {
      rallyingPoint: {
        label: "Luchon",
        location: {
          lat: 0.54,
          lng: 42.75
        }
      },
      duration: 6000
    }
  ],
  members: []
};

const user = { name: "John Doe" };
export const LianeInvitationScreen = () => {
  const insets = useSafeAreaInsets();
  const color = WithAlpha(AppColors.white, 0.15);
  const textcolor = AppColors.white;

  return (
    <View style={styles.windowContainer}>
      <Column
        style={[
          styles.container,
          {
            marginTop: insets.top + 32,
            marginBottom: insets.bottom + 32
          }
        ]}>
        <View style={styles.paddedContainer}>
          <AppText style={styles.title}>
            <AppText style={[styles.title, styles.bold]}>{user.name}</AppText> vous invite à rejoindre une liane :
          </AppText>
        </View>
        <View style={styles.line} />
        <View style={styles.paddedContainer}>
          <View style={styles.mainSectionContainer}>
            <Column spacing={verticalCardSpacing}>
              <Row spacing={horizontalCardSpacing}>
                <CardButton value={liane.wayPoints[0].rallyingPoint.label} color={color} label={"Départ de"} textColor={textcolor} />
                <CardButton
                  value={liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint.label}
                  color={color}
                  label={"Arrivée à"}
                  textColor={textcolor}
                />
              </Row>
              <Row spacing={horizontalCardSpacing}>
                <CardButton value={formatShortMonthDay(new Date(liane.departureTime))} color={color} label={"Date"} textColor={textcolor} />
                <CardButton value={formatTime(new Date(liane.departureTime))} color={color} label={"Départ à"} textColor={textcolor} />
              </Row>
              <Row style={styles.singleCardRow}>
                <CardButton value={"2"} color={color} label={"Places restantes"} textColor={textcolor} />
              </Row>
            </Column>
          </View>

          <Row spacing={horizontalCardSpacing}>
            <AppIcon name="swap-outline" color={AppColors.white} />
            <AppText style={styles.sectionTitle}>Trajet de retour</AppText>
          </Row>
          <View style={styles.smallSectionContainer}>
            <Row style={styles.singleCardRow}>
              {liane.returnTime != undefined && (
                <CardButton value={formatTime(new Date(liane.returnTime))} color={color} label={"Départ à"} textColor={textcolor} />
              )}
              {liane.returnTime == undefined && <CardButton value="Aucun" color={color} textColor={textcolor} />}
            </Row>
          </View>
        </View>
        <WavingMonkey style={{ position: "absolute", bottom: -136, right: 8 }} width="56%" />
        <Column
          spacing={16}
          style={{ backgroundColor: AppColors.white, borderRadius: 16, padding: 16, position: "absolute", bottom: 16, left: 16, right: 16 }}>
          <AppText style={{ fontSize: 16 }}>Que voulez-vous faire ?</AppText>
          <Row spacing={8} style={{ justifyContent: "flex-end" }}>
            <PopupButton color={AppColors.white} backgroundColor={AppColorPalettes.blue[400]} text="Décliner" onPress={() => {}} />
            <PopupButton color={AppColors.white} backgroundColor={AppColors.blue} text="Rejoindre" onPress={() => {}} />
          </Row>
        </Column>
      </Column>
    </View>
  );
};

// TODO common component with PagerButton ?
const PopupButton = ({ color, backgroundColor, text, onPress, opacity = 1 }) => (
  <Pressable onPress={onPress}>
    <View
      style={{
        backgroundColor,
        opacity,
        borderRadius: 24
      }}>
      <AppText
        style={{
          fontWeight: "600",
          fontSize: 14,
          color,
          textAlign: "center",
          padding: 12
        }}>
        {text}
      </AppText>
    </View>
  </Pressable>
);

const horizontalCardSpacing = 12;
const verticalCardSpacing = 8;

const styles = StyleSheet.create({
  windowContainer: {
    backgroundColor: AppColors.white,
    flex: 1
  },
  container: {
    borderRadius: 16,
    flex: 1,
    backgroundColor: AppColors.darkBlue,
    marginHorizontal: 8
  },
  paddedContainer: {
    padding: 16
  },
  line: {
    backgroundColor: AppColors.blue,
    height: 4,
    width: "100%"
  },
  title: {
    color: AppColors.white,
    fontSize: 24
  },
  bold: {
    fontWeight: "600"
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  mainSectionContainer: {
    paddingVertical: 16
  },
  smallSectionContainer: {
    marginBottom: 12,
    paddingVertical: 12
  },
  singleCardRow: {
    width: "50%",
    paddingRight: horizontalCardSpacing / 2
  },
  sectionTitle: {
    fontSize: AppDimensions.textSize.medium,
    fontWeight: "500",
    color: AppColors.white
  }
});
