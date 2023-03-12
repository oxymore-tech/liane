import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import React, { PropsWithChildren, ReactNode, useMemo } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export interface AppPressableProps extends PressableProps, PropsWithChildren {
  backgroundStyle?: StyleProp<ViewStyle>;
  foregroundStyle?: StyleProp<ViewStyle>;
  children: ReactNode | undefined;
  clickable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pressable with an overlay when pressed
 */
export function AppPressable({ backgroundStyle, foregroundStyle, children, style, clickable = true, ...props }: AppPressableProps) {
  const opacitySv = useSharedValue(0);
  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(opacitySv.value, { duration: 75 })
    };
  }, []);
  const foreground = useMemo(() => {
    if (foregroundStyle) {
      return foregroundStyle;
    }
    if (backgroundStyle) {
      // Get border radius from background shape
      const styles = StyleSheet.flatten(backgroundStyle);
      return Object.fromEntries(
        [
          "borderRadius",
          "borderBottomEndRadius",
          "borderBottomLeftRadius",
          "borderBottomRightRadius",
          "borderBottomStartRadius",
          "borderTopEndRadius",
          "borderTopLeftRadius",
          "borderTopRightRadius",
          "borderTopStartRadius"
        ].map(k => [k, styles[k]])
      );
    }
    return {};
  }, [backgroundStyle, foregroundStyle]);

  const contentView = useMemo(() => <View style={style}>{children}</View>, [children, style]);

  return (
    <Pressable
      {...props}
      style={backgroundStyle}
      onTouchEnd={() => {
        opacitySv.value = 0;
      }}
      onTouchCancel={() => {
        opacitySv.value = 0;
      }}
      onTouchStart={() => {
        opacitySv.value = 1;
      }}>
      <View>
        {contentView}
        {clickable && <Animated.View style={[styles.pressedDefault, foreground, styles.pressedFixed, opacityStyle]} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressedDefault: {
    backgroundColor: "rgba(0,0,0,0.3)"
  },
  pressedFixed: {
    position: "absolute",
    right: 0,
    left: 0,
    top: 0,
    bottom: 0
  }
});
