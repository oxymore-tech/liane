import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { StyleProp, ViewStyle } from "react-native";
import { ItineraryForm } from "@/components/forms/ItineraryForm";
import React from "react";
import { Itinerary } from "@liane/common";

export type ToOrFrom = "to" | "from";

export type ItineraryFormHeaderProps = {
  editable?: boolean;
  field?: ToOrFrom;
  onChangeField?: (field: ToOrFrom, value: string) => void;
  onRequestFocus?: (field: ToOrFrom) => void;
  trip: Partial<Itinerary>;
  animateEntry?: boolean;
  updateTrip: (trip: Partial<Itinerary>) => void;
  title?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export const ItineraryFormHeader = ({
  trip,
  updateTrip,
  containerStyle,
  style,
  field,
  onChangeField,
  onRequestFocus,
  animateEntry = true,
  editable = true
}: ItineraryFormHeaderProps) => {
  const { to, from } = trip;

  return (
    <Animated.View style={containerStyle} entering={animateEntry ? SlideInUp : undefined} exiting={SlideOutUp}>
      <ItineraryForm
        style={style}
        from={from}
        to={to}
        field={field}
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
