import { AppTextInput, AppTextInputProps } from "@/components/base/AppTextInput";
import { useMemo, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";

export const AppExpandingTextInput = ({ style, backgroundStyle, ...props }: AppTextInputProps & { backgroundStyle?: StyleProp<ViewStyle> }) => {
  const [contentHeight, setContentHeight] = useState(52);
  const { height } = useAppWindowsDimensions();
  const padding = useMemo(() => {
    if (backgroundStyle) {
      // Get border radius from background shape
      const styles = StyleSheet.flatten(backgroundStyle);

      const obj = Object.fromEntries(
        ["padding", "paddingTop", "paddingBottom", "paddingVertical"].map(k => {
          //@ts-ignore
          return [k, styles[k]];
        })
      );
      return {
        paddingTop: obj.paddingTop || obj.paddingVertical || obj.padding || 0,
        paddingBottom: obj.paddingBottom || obj.paddingVertical || obj.padding || 0
      };
    }
    return { paddingTop: 0, paddingBottom: 0 };
  }, [backgroundStyle]);
  return (
    <View
      style={[
        backgroundStyle,
        {
          flexGrow: 1,
          height: contentHeight + padding.paddingBottom + padding.paddingTop,
          maxHeight: height / 3
        }
      ]}>
      <AppTextInput
        {...props}
        onContentSizeChange={event => {
          setContentHeight(event.nativeEvent.contentSize.height);
        }}
        style={[style, { height: 300, maxHeight: height / 3 }]}
      />
    </View>
  );
};
