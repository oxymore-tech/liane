import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import React, { PropsWithChildren, ReactNode, useMemo } from "react";

export interface AppPressableProps extends PressableProps, PropsWithChildren {
  backgroundStyle?: StyleProp<ViewStyle>;
  foregroundStyle?: StyleProp<ViewStyle>;
  children: ReactNode | undefined;

  style?: StyleProp<ViewStyle>;
}

/**
 * Pressable with an overlay when pressed
 */
export function AppPressable({ backgroundStyle, foregroundStyle, children, style, ...props }: AppPressableProps) {
  const foreground =
    foregroundStyle ||
    useMemo(() => {
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
    }, [backgroundStyle]);

  const contentView = useMemo(() => <View style={style}>{children}</View>, [children, style]);

  return (
    <Pressable {...props} style={backgroundStyle}>
      {({ pressed }) => (
        <View>
          {contentView}
          {pressed && <View style={[styles.pressedDefault, foreground, styles.pressedFixed]} />}
        </View>
      )}
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
