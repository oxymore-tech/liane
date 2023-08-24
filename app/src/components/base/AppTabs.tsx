import React from "react";
import { ColorValue, LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Column, Row } from "@/components/base/AppLayout";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";

import { AppColorPalettes, AppColors } from "@/theme/colors";

export interface AppTabsProps {
  items: string[];
  onSelect: (index: number) => void;
  selectedColor?: ColorValue;
  unselectedTextColor?: ColorValue;
  selectedTextColor?: ColorValue;
  selectedIndex?: number;
  isSelectable?: ((index: number) => boolean) | undefined;
  fontSize?: number;
}

export const AppTabs = ({
  items,
  isSelectable,
  onSelect,
  selectedIndex = 0,
  selectedColor = AppColors.orange,
  unselectedTextColor = AppColorPalettes.gray[800],
  selectedTextColor = AppColorPalettes.gray[800],
  fontSize = 14
}: AppTabsProps) => {
  const offset = useSharedValue(0);
  const width = useSharedValue(0);

  const translateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    width: width.value
  }));

  return (
    <Column>
      <Row>
        {items.map((item, index) => (
          <AppPressableOverlay
            key={index}
            disabled={isSelectable ? !isSelectable(index) : false}
            onLayout={event => onLayout(event, index, selectedIndex, width, offset)}
            onPress={() => onSelect(index)}>
            <AppText
              style={[
                styles.textStyle,
                { fontSize: fontSize },
                { fontWeight: selectedIndex === index ? "bold" : undefined },
                { color: selectedIndex === index ? selectedTextColor : unselectedTextColor }
              ]}>
              {item}
            </AppText>
          </AppPressableOverlay>
        ))}
      </Row>
      <View style={styles.underline} />
      <Animated.View style={[styles.animatedView, translateStyle, { backgroundColor: selectedColor }]} />
    </Column>
  );
};

const onLayout = (event: LayoutChangeEvent, index: number, selectedIndex: number, width: SharedValue<number>, offset: SharedValue<number>) => {
  if (index === selectedIndex) {
    width.value = withTiming(event.nativeEvent.layout.width, {
      duration: 300,
      easing: Easing.out(Easing.exp)
    });
    offset.value = withTiming(event.nativeEvent.layout.x, {
      duration: 300,
      easing: Easing.out(Easing.ease)
    });
  }
};

const styles = StyleSheet.create({
  textStyle: {
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  underline: {
    borderBottomColor: AppColorPalettes.gray[200],
    borderBottomWidth: 1
  },
  animatedView: {
    borderRadius: 2,
    height: 4,
    position: "relative",
    top: -3
  }
});
