import React from "react";
import { Column, Row } from "@/components/base/AppLayout";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";
import { defaultTextColor } from "@/theme/colors";
import { ColorValue, StyleSheet } from "react-native";
import { BaseFormComponentProps, WithFormController } from "@/components/forms/WithFormController";

export interface SwitchProps {
  unselectedColor: ColorValue;
  color: ColorValue;
  padding?: number;
  trueLabel: string;
  falseLabel: string;
  trueIcon?: JSX.Element;
  falseIcon?: JSX.Element;

  isHeaderStyle?: boolean;
}

export type SwitchIconToggle = Omit<Omit<SwitchProps, "trueLabel">, "falseLabel">;

export const SwitchIconToggle = ({
  unselectedColor,
  color,
  trueIcon,
  falseIcon,
  value,
  onChange,
  padding = 6,
  isHeaderStyle = false
}: SwitchIconToggle & { value: boolean; onChange: () => void }) => {
  const unselectedPadding = padding - 2;
  return (
    <Row>
      <AppPressableOverlay
        onPress={onChange}
        clickable={!value}
        style={{
          paddingVertical: value ? padding : unselectedPadding,
          paddingHorizontal: (value ? padding : unselectedPadding) + 2
        }}
        backgroundStyle={{
          backgroundColor: value ? color : unselectedColor,
          borderTopLeftRadius: 12,
          borderTopRightRadius: value ? 4 : 0,
          borderBottomRightRadius: value ? 4 : 0,
          borderBottomLeftRadius: isHeaderStyle ? 0 : 12,
          marginBottom: value ? 0 : 2,
          alignSelf: "flex-end"
        }}>
        <Column style={styles.column} spacing={4}>
          {trueIcon}
        </Column>
      </AppPressableOverlay>
      <AppPressableOverlay
        onPress={onChange}
        clickable={value}
        style={{ paddingVertical: !value ? padding : unselectedPadding, paddingHorizontal: (!value ? padding : unselectedPadding) + 2 }}
        backgroundStyle={{
          backgroundColor: !value ? color : unselectedColor,
          borderTopRightRadius: 12,
          borderTopLeftRadius: !value ? 4 : 0,
          borderBottomLeftRadius: !value ? 4 : 0,
          borderBottomRightRadius: isHeaderStyle ? 0 : 12,
          marginBottom: !value ? 0 : 2,
          alignSelf: "flex-end"
        }}>
        <Column style={styles.column} spacing={4}>
          {falseIcon}
        </Column>
      </AppPressableOverlay>
    </Row>
  );
};
export const SwitchToggle = ({
  unselectedColor,
  color,
  trueLabel,
  falseLabel,
  trueIcon,
  falseIcon,
  value,
  onChange,
  padding = 12,
  isHeaderStyle = true
}: SwitchProps & { value: boolean; onChange: () => void }) => {
  const unselectedPadding = padding - 2;
  return (
    <Row>
      <AppPressableOverlay
        onPress={!value ? onChange : undefined}
        clickable={!value}
        style={{
          padding: value ? padding : unselectedPadding
        }}
        backgroundStyle={{
          backgroundColor: value ? color : unselectedColor,
          borderTopLeftRadius: 16,
          borderTopRightRadius: value ? 4 : 0,
          borderBottomLeftRadius: isHeaderStyle ? 0 : 16,
          width: "50%",
          alignSelf: "flex-end"
        }}>
        <Column style={styles.column} spacing={4}>
          {trueIcon}
          <AppText
            style={[{ textDecorationLine: value ? "underline" : undefined, textAlign: "center", color: defaultTextColor(color) }, styles.switch]}>
            {trueLabel}
          </AppText>
        </Column>
      </AppPressableOverlay>
      <AppPressableOverlay
        onPress={value ? onChange : undefined}
        clickable={value}
        style={{ padding: !value ? padding : unselectedPadding }}
        backgroundStyle={{
          backgroundColor: !value ? color : unselectedColor,
          borderTopRightRadius: 16,
          borderTopLeftRadius: !value ? 4 : 0,
          borderBottomRightRadius: isHeaderStyle ? 0 : 16,
          alignSelf: "flex-end",
          width: "50%"
        }}>
        <Column style={styles.column} spacing={4}>
          {falseIcon}
          <AppText
            style={[{ textDecorationLine: !value ? "underline" : undefined, textAlign: "center", color: defaultTextColor(color) }, styles.switch]}>
            {falseLabel}
          </AppText>
        </Column>
      </AppPressableOverlay>
    </Row>
  );
};
export const SwitchToggleForm = WithFormController(
  ({
    unselectedColor,
    color,
    trueLabel,
    falseLabel,
    trueIcon,
    falseIcon,
    value,
    onChange,
    padding = 12
  }: SwitchProps & BaseFormComponentProps<boolean>) => {
    const changeSelection = (v: boolean) => {
      onChange(v);
    };

    const unselectedPadding = padding - 2;

    return (
      <Row>
        <AppPressableOverlay
          onPress={() => changeSelection(true)}
          clickable={!value}
          style={{
            padding: value ? padding : unselectedPadding
          }}
          backgroundStyle={{
            backgroundColor: value ? color : unselectedColor,
            borderTopLeftRadius: 16,
            borderTopRightRadius: value ? 4 : 0,
            width: "50%",
            alignSelf: "flex-end"
          }}>
          <Column style={styles.column} spacing={4}>
            {trueIcon}
            <AppText
              style={[{ textDecorationLine: value ? "underline" : undefined, textAlign: "center", color: defaultTextColor(color) }, styles.switch]}>
              {trueLabel}
            </AppText>
          </Column>
        </AppPressableOverlay>
        <AppPressableOverlay
          onPress={() => changeSelection(false)}
          clickable={value}
          style={{ padding: !value ? padding : unselectedPadding }}
          backgroundStyle={{
            backgroundColor: !value ? color : unselectedColor,
            borderTopRightRadius: 16,
            borderTopLeftRadius: !value ? 4 : 0,
            alignSelf: "flex-end",
            width: "50%"
          }}>
          <Column style={styles.column} spacing={4}>
            {falseIcon}
            <AppText
              style={[{ textDecorationLine: !value ? "underline" : undefined, textAlign: "center", color: defaultTextColor(color) }, styles.switch]}>
              {falseLabel}
            </AppText>
          </Column>
        </AppPressableOverlay>
      </Row>
    );
  }
);
/*
export const SelectToggleForm = WithFormController(
  ({ unselectedColor, color, values, value, onChange, padding = 12 }: SwitchProps & BaseFormComponentProps<string>) => {
    const changeSelection = index => {
      onChange(values[index]);
    };

    useEffect(() => {
      if (!value) {
        changeSelection(0);
      }
    }, [changeSelection, value]);
    const unselectedPadding = padding - 2;

    return (
      <Row>
        <AppPressable
          onPress={() => changeSelection(0)}
          clickable={value !== values[0]}
          style={{
            padding: value === values[0] ? padding : unselectedPadding
          }}
          backgroundStyle={{
            backgroundColor: value === values[0] ? color : unselectedColor,
            borderTopLeftRadius: 16,
            borderTopRightRadius: value === values[0] ? 4 : 0,
            width: "50%",
            alignSelf: "flex-end"
          }}>
          <AppText
            style={[
              { textDecorationLine: value === values[0] ? "underline" : undefined, textAlign: "center", color: defaultTextColor(color) },
              styles.switch
            ]}>
            {values[0]}
          </AppText>
        </AppPressable>
        <AppPressable
          onPress={() => changeSelection(1)}
          clickable={value !== values[1]}
          style={{ padding: value === values[1] ? padding : unselectedPadding }}
          backgroundStyle={{
            backgroundColor: value === values[1] ? color : unselectedColor,
            borderTopRightRadius: 16,
            borderTopLeftRadius: value === values[1] ? 4 : 0,
            alignSelf: "flex-end",
            width: "50%"
          }}>
          <AppText
            style={[
              { textDecorationLine: value === values[1] ? "underline" : undefined, textAlign: "center", color: defaultTextColor(color) },
              styles.switch
            ]}>
            {values[1]}
          </AppText>
        </AppPressable>
      </Row>
    );
  }
);
*/
const styles = StyleSheet.create({
  switch: {
    fontSize: 14,
    fontWeight: "400"
  },
  selectedSwitch: {
    fontSize: 14,
    fontWeight: "600"
  },
  column: {
    alignItems: "center"
  }
});
