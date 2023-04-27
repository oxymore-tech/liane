import { ColorValue, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import React, { forwardRef, useContext, useImperativeHandle, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { RallyingPoint } from "@/api";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointItem } from "@/screens/ItinerarySearchForm";
import { HomeMapContext } from "@/screens/home/StateMachine";
import Animated, { SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import { FloatingBackButton } from "@/screens/detail/Components";

export const RallyingPointField = forwardRef(
  (
    {
      onChange,
      value,
      editable = true,
      onFocus = () => {},
      showTrailing,
      icon,
      placeholder
    }: {
      onChange: (v: string | undefined) => void;
      value: string;
      editable?: boolean;
      onFocus?: () => void;
      showTrailing: boolean;
      icon: JSX.Element;
      placeholder: string;
    },
    ref
  ) => {
    const inputRef = useRef<TextInput>(null);
    useImperativeHandle(ref, () => inputRef.current);

    const field = (
      <View style={styles.inputContainer} pointerEvents={editable ? undefined : "none"}>
        <AppTextInput
          trailing={
            showTrailing ? (
              <Pressable
                style={{ marginRight: 12 }}
                onPress={() => {
                  inputRef.current?.clear();
                  onChange(undefined);
                  inputRef.current?.focus();
                }}>
                <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
              </Pressable>
            ) : undefined
          }
          ref={inputRef}
          editable={editable}
          selection={editable ? undefined : { start: 0 }}
          style={AppStyles.input}
          leading={icon}
          placeholder={placeholder}
          value={value}
          onChangeText={v => {
            onChange(v);
          }}
          onFocus={onFocus}
        />
      </View>
    );

    return editable ? (
      field
    ) : (
      <Pressable
        onPress={() => {
          onFocus();
        }}>
        {field}
      </Pressable>
    );
  }
);

export const RallyingPointHeader = ({ onBackPressed, rallyingPoint }: { rallyingPoint: RallyingPoint; onBackPressed?: () => void }) => {
  const insets = useSafeAreaInsets();
  const machine = useContext(HomeMapContext);
  return (
    <Column style={[styles.footerContainer, AppStyles.shadow, { paddingTop: insets.top + 8 }]} spacing={8}>
      <Row>
        <Pressable
          style={{ paddingVertical: 8 }}
          onPress={() => {
            if (onBackPressed) {
              onBackPressed();
            }
          }}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={AppColors.white} />
        </Pressable>
      </Row>
      <Row style={{ alignItems: "center", paddingHorizontal: 8 }} spacing={16}>
        <LocationPin fill={AppColors.white} height={32} />
        <View style={{ flexShrink: 1 }}>
          <RallyingPointItem item={rallyingPoint} color={AppColors.white} labelSize={18} />
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          style={[styles.smallActionButton, { backgroundColor: AppColors.white }]}
          onPress={() => {
            machine.send("UPDATE", { data: { to: rallyingPoint } });
          }}>
          <AppIcon name={"swap-outline"} color={AppColors.pink} />
        </Pressable>
      </Row>
    </Column>
  );
};

export const AnimatedFloatingBackButton = (props: { onPress: () => void; color?: ColorValue; iconColor?: ColorValue }) => {
  return (
    <Animated.View entering={SlideInLeft} exiting={SlideOutLeft}>
      <FloatingBackButton {...props} />
    </Animated.View>
  );
};
const styles = StyleSheet.create({
  floatingSearchBar: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: "absolute",
    width: "100%"
  },
  actionButton: {
    padding: 12,
    borderRadius: 52
  },
  title: { color: AppColors.white, ...AppStyles.title },
  smallActionButton: {
    padding: 8,
    borderRadius: 52
  },

  footerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexShrink: 1,
    paddingBottom: 16,
    backgroundColor: AppColors.darkBlue,
    alignSelf: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16
  },
  inputContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  }
});
