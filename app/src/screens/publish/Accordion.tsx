import { AppColors } from "@/theme/colors.ts";
import { LogBox, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOutRight, SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import React, { useEffect } from "react";
import { AppText } from "@/components/base/AppText.tsx";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";

export type AccordionProps = {
  title: string;
  header?: React.ReactNode;
  step: number;
  onChangeStep?: (step: number) => void;
  steps?: AccordionItemProps[];
  style?: StyleProp<ViewStyle>;
  stepStyle?: StyleProp<ViewStyle>;
};

export function Accordion({ step, onChangeStep, steps = [], style, stepStyle }: AccordionProps) {
  useEffect(() => {
    LogBox.ignoreLogs([
      "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing and other functionality - use another VirtualizedList-backed container instead."
    ]);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[{ display: "flex" }, style]} keyboardShouldPersistTaps="always">
        {steps
          .filter((_, index) => step >= index)
          .map((item, index) => {
            const selected = step === index;
            return selected || item.disableSummary ? (
              <AccordionStep key={index} style={stepStyle} selected={selected} {...item} />
            ) : (
              <AccordionSummary key={index} title={item.title} onPress={() => onChangeStep && onChangeStep(index)} />
            );
          })}
      </ScrollView>
    </View>
  );
}

export type AccordionItemProps = {
  title: string;
  editable?: boolean;
  disableSummary?: boolean;
  render: (selected: boolean) => React.ReactNode;
};

export type AccordionStepProps = AccordionItemProps & {
  style?: StyleProp<ViewStyle>;
  selected: boolean;
};

const AccordionStep = ({ selected, style, render }: AccordionStepProps) => {
  return (
    <Animated.View
      exiting={SlideOutLeft.duration(20)}
      entering={SlideInLeft.delay(50).duration(300).springify().damping(20)}
      style={[styles.stepContainer, style]}>
      {render(selected)}
    </Animated.View>
  );
};

export type AccordionSummaryProps = {
  title: string;
  onPress: () => void;
};

const AccordionSummary = ({ title, onPress }: AccordionSummaryProps) => {
  return (
    <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
      <Pressable onPress={onPress}>
        <Row style={styles.summaryContainer}>
          <AppText style={styles.summary}>{title}</AppText>
          <AppIcon name="edit" color={AppColors.white} />
        </Row>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  summary: {
    fontWeight: "bold",
    color: AppColors.white,
    fontSize: 16,
    alignSelf: "center",
    textAlignVertical: "center"
  },
  stepContainer: {
    marginTop: 4
  },
  summaryContainer: {
    paddingHorizontal: 16,
    backgroundColor: AppColors.primaryColor,
    borderRadius: 16,
    height: 48,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4
  }
});
