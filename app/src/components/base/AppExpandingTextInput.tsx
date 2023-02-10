import { AppTextInput, AppTextInputProps } from "@/components/base/AppTextInput";
import { useState } from "react";
import { AppColors } from "@/theme/colors";
import { useWindowDimensions, View } from "react-native";

const margin = 16;
export const AppExpandingTextInput = ({ style, ...props }: AppTextInputProps) => {
  const [contentHeight, setContentHeight] = useState(40);
  const { height } = useWindowDimensions();
  return (
    <View
      style={{
        backgroundColor: AppColors.white,
        borderRadius: margin,
        padding: margin,
        flexGrow: 1,
        height: contentHeight + margin * 2,
        maxHeight: height / 3 + margin * 2
      }}>
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
