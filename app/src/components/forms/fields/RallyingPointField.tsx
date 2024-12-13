import { forwardRef, ReactElement, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { AppTextInput } from "@/components/base/AppTextInput.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";

type RallyingPointFieldProps = {
  onChange: (v: string) => void;
  value: string;
  editable?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  showTrailing: boolean;
  icon: ReactElement;
  placeholder: string;
  info?: string;
};

export const RallyingPointField = forwardRef(
  (
    { onChange, value, editable = true, autoFocus = false, onFocus = () => {}, showTrailing, icon, placeholder, info }: RallyingPointFieldProps,
    ref
  ) => {
    const inputRef = useRef<TextInput>(null);
    useImperativeHandle(ref, () => inputRef.current);

    const field = (
      <View style={styles.inputRallyingPointContainer} pointerEvents={editable ? undefined : "none"}>
        <AppTextInput
          autoFocus={autoFocus}
          trailing={
            showTrailing ? (
              <Pressable
                style={{ marginRight: 12 }}
                onPress={() => {
                  inputRef.current?.clear();
                  onChange("");
                  inputRef.current?.focus();
                }}>
                <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
              </Pressable>
            ) : undefined
          }
          ref={inputRef}
          editable={editable}
          selection={editable ? undefined : { start: 0 }}
          leading={icon}
          placeholder={placeholder}
          value={value}
          onChangeText={v => onChange(v)}
          onFocus={onFocus}
          subText={info}
        />
      </View>
    );

    return editable ? field : <Pressable onPress={() => onFocus()}>{field}</Pressable>;
  }
);

const styles = StyleSheet.create({
  inputRallyingPointContainer: {
    marginHorizontal: 8,
    paddingHorizontal: 12,
    height: 42,
    color: AppColors.white
  }
});
