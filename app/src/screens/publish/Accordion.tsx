import { AppColors } from "@/theme/colors.ts";
import { LogBox, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOutRight, SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import React, { useEffect } from "react";
import { AppText } from "@/components/base/AppText.tsx";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppStyles } from "@/theme/styles.ts";

export type AccordionProps = {
  title: string;
  header?: React.ReactNode;
  step: number;
  onChangeStep?: (step: number) => void;
  steps?: AccordionItemProps[];
  style?: StyleProp<ViewStyle>;
  stepStyle?: StyleProp<ViewStyle>;
};

export function Accordion({ header, step, onChangeStep, steps = [], style, stepStyle }: AccordionProps) {
  const offset = header ? 1 : 0;

  useEffect(() => {
    LogBox.ignoreLogs([
      "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing and other functionality - use another VirtualizedList-backed container instead."
    ]);
  }, []);

  return (
    <ScrollView style={[{ display: "flex" }, style]} keyboardShouldPersistTaps="always">
      {header && <View style={[{ flex: step === 0 ? 1 : undefined }, styles.headerContainer]}>{header}</View>}
      {steps
        .filter((_, index) => step >= index + offset)
        .map((item, index) => {
          const stepIndex = index + offset;
          const selected = step === stepIndex;
          return selected || item.disableSummary ? (
            <AccordionStep key={stepIndex} style={stepStyle} selected={selected} {...item} />
          ) : (
            <AccordionSummary
              key={stepIndex}
              index={stepIndex}
              title={item.title}
              onPress={() => onChangeStep && onChangeStep(stepIndex)}
              last={index + 1 === steps.length}
            />
          );
        })}
    </ScrollView>
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
  index: number;
  last: boolean;
};

const AccordionSummary = ({ title, index, onPress, last }: AccordionSummaryProps) => {
  return (
    <Animated.View
      exiting={FadeOutRight.duration(300)}
      entering={FadeIn.duration(300).springify().damping(15)}
      style={{ marginTop: -16, zIndex: -1 - index }}>
      <Pressable onPress={onPress}>
        <Row style={[styles.summaryContainer, !last ? AppStyles.shadow : undefined]}>
          <AppText style={styles.summary}>{title}</AppText>
          <AppIcon name={"edit-2"} color={AppColors.white} />
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
    marginTop: 12
  },
  headerContainer: {
    borderRadius: 18
  },
  summaryContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: AppColors.primaryColor,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    height: 75,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: AppColors.lightGrayBackground
  }
});
