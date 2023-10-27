import { Trip } from "@/api/service/location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppBackController } from "@/components/AppBackContextProvider";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { AppStyles } from "@/theme/styles";
import { Column, Row } from "@/components/base/AppLayout";
import { Pressable, StyleSheet } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { ItineraryForm } from "@/components/forms/ItineraryForm";
import React from "react";
import { FloatingBackButton } from "../FloatingBackButton";
import { useAppNavigation } from "@/api/navigation";

export interface ItineraryFormHeaderProps {
  editable?: boolean;
  // onChangeFrom?: (value: string | undefined) => void;
  onChangeField?: (field: "to" | "from", value: string | undefined) => void;
  onRequestFocus?: (field: "to" | "from") => void;
  trip: Partial<Trip>;
  animateEntry?: boolean;
  updateTrip: (trip: Partial<Trip>) => void;

  title?: string;
}

export const ItineraryFormHeader = ({
  trip,
  updateTrip,

  onChangeField,
  onRequestFocus,
  animateEntry: enters = true,
  editable = true
}: ItineraryFormHeaderProps) => {
  const { to, from } = trip;

  return (
    <Animated.View style={[styles.headerContainer]} entering={enters ? SlideInUp : undefined} exiting={SlideOutUp}>
      <ItineraryForm
        from={from}
        to={to}
        onChangeFrom={onChangeField ? v => onChangeField("from", v) : undefined}
        onChangeTo={onChangeField ? v => onChangeField("to", v) : undefined}
        onValuesSwitched={(oldFrom, oldTo) => {
          updateTrip({ from: oldTo, to: oldFrom });
        }}
        editable={editable}
        onRequestFocus={onRequestFocus}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingSearchBar: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: "absolute",
    width: "100%"
  },
  actionButton: {
    padding: 12,
    borderRadius: 52
  },
  title: { color: AppColors.white, ...AppStyles.title },
  smallActionButton: {
    padding: 8,
    borderRadius: 52
  },
  headerContainer: {
    width: "100%",
    height: 140,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  }
});
