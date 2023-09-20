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
  selectedColor = AppColors.primaryColor,
  fontSize = 14
}: AppTabsProps) => {
  const offset = useSharedValue(0);
  const width = useSharedValue(0);

  const translateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    width: width.value
  }));

  return (
    <Column style={styles.mainContainer}>
      <Row style={styles.rowContainer}>
        {items.map((item, index) => (
          <AppPressableOverlay
            key={index}
            style={styles.pressableStyle}
            disabled={isSelectable ? !isSelectable(index) : false}
            onLayout={event => onLayout(event, index, selectedIndex, width, offset)}
            onPress={() => onSelect(index)}
            borderRadius={18}>
            <AppText
              style={[
                styles.textStyle,
                selectedIndex === index ? styles.selected : styles.unselected,
                { fontSize: fontSize },
                { backgroundColor: selectedIndex === index ? selectedColor : AppColors.white },
                { color: selectedIndex === index ? AppColors.backgroundColor : AppColors.fontColor }
              ]}>
              {item}
            </AppText>
          </AppPressableOverlay>
        ))}
      </Row>
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
  mainContainer: {
    marginHorizontal: 18
  },
  rowContainer: {
    alignItems: "center",
    justifyContent: "space-between"
  },
  pressableStyle: {
    borderRadius: 12
  },
  textStyle: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 0
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
  },
  selected: {
    fontWeight: "bold",
    color: AppColors.white
  },
  unselected: {
    borderWidth: 1,
    borderColor: AppColors.fontColor
  }
});
