import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { AppStyles } from "@/theme/styles";
import { StyleSheet } from "react-native";
import { AppColors } from "@/theme/colors";
import { ItineraryForm } from "@/components/forms/ItineraryForm";
import React from "react";
import { Trip } from "@liane/common";

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
