import { AppTextInput, AppTextInputProps } from "@/components/base/AppTextInput";
import { useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";

export const AppExpandingTextInput = ({ style, backgroundStyle, ...props }: AppTextInputProps & { backgroundStyle?: StyleProp<ViewStyle> }) => {
  const [contentHeight, setContentHeight] = useState(40);
  const { height } = useAppWindowsDimensions();
  return (
    <View
      style={[
        backgroundStyle,
        {
          flexGrow: 1,
          height: contentHeight,
          maxHeight: height / 3
        }
      ]}>
      <AppTextInput
        {...props}
        multiline={true}
        onContentSizeChange={event => {
          setContentHeight(event.nativeEvent.contentSize.height);
        }}
        style={[style, { height: contentHeight, alignSelf: "flex-end", maxHeight: height / 3 }]}
      />
    </View>
  );
};
