import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Column } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { RallyingPointField } from "@/screens/home/HomeHeader";
import { RallyingPoint } from "@liane/common";
import { AppPressableIcon } from "@/components/base/AppPressable";

export interface ItineraryFormProps {
  editable?: boolean;
  onChangeFrom?: (value: string | undefined) => void;
  onChangeTo?: (value: string | undefined) => void;
  onRequestFocus?: (field: "to" | "from") => void;
  to: RallyingPoint | undefined;
  from: RallyingPoint | undefined;
  onValuesSwitched: (oldFrom: RallyingPoint | undefined, oldTo: RallyingPoint | undefined) => void;
}
export const ItineraryForm = ({
  from,
  to,
  onValuesSwitched = () => {},
  onChangeFrom = () => {},
  onChangeTo = () => {},
  editable = true
}: ItineraryFormProps) => {
  const [searchFrom, setSearchFrom] = useState<string>();
  const [searchTo, setSearchTo] = useState<string>();
  const [focused, setFocused] = useState<"from" | "to" | undefined>();
  const inputRefFrom = useRef<TextInput>(null);
  const inputRefTo = useRef<TextInput>(null);

  useEffect(() => {
    if (from) {
      if (!to) {
        inputRefTo.current?.focus();
      }

      setSearchFrom(from?.label);
    }
    if (to) {
      if (!from) {
        inputRefFrom.current?.focus();
      }

      setSearchTo(to?.label);
    }
  }, [from, to]);

  return (
    <Column spacing={6} style={styles.containerStyle}>
      <RallyingPointField
        ref={inputRefTo}
        onChange={v => {
          setSearchTo(v);
          onChangeTo(v);
        }}
        value={to?.label || searchTo || ""}
        onFocus={() => {
          setFocused("to");
          if (!editable) {
            onChangeTo(undefined);
          } else {
            onChangeTo(searchTo);
          }
        }}
        editable={editable}
        placeholder={"Où allez-vous ?"}
        icon={<AppIcon name={"flag"} color={AppColors.primaryColor} />}
        showTrailing={focused === "to" && (to || (searchTo && searchTo.length > 0)) === true}
      />

      <RallyingPointField
        ref={inputRefFrom}
        onChange={v => {
          setSearchFrom(v);
          onChangeFrom(v);
        }}
        value={from?.label || searchFrom || ""}
        onFocus={() => {
          setFocused("from");
          if (!editable) {
            onChangeFrom(undefined);
          } else {
            onChangeFrom(searchFrom);
          }
        }}
        editable={editable}
        placeholder={"... et votre départ !"}
        icon={<AppIcon name={"pin"} color={AppColors.primaryColor} />}
        showTrailing={(focused === "from" && (from || (searchFrom && searchFrom.length > 0))) === true}
      />

      {(to || from) && (
        <View style={{ position: "absolute", right: 0, top: 8, height: "100%", justifyContent: "center" }}>
          <AppPressableIcon
            name={"arrow-switch"}
            style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}
            backgroundStyle={{
              backgroundColor: AppColors.primaryColor,
              borderTopLeftRadius: 20,
              borderBottomLeftRadius: 20,
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2
            }}
            color={AppColors.white}
            size={16}
            onPress={() => {
              if (!from) {
                setSearchTo(searchFrom);
              }
              if (!to) {
                setSearchFrom(searchTo);
              }
              onValuesSwitched(from, to);
            }}
          />
        </View>
      )}
    </Column>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    borderWidth: 2,
    borderColor: AppColors.lightGrayBackground,
    borderRadius: 18,
    paddingVertical: 12,
    backgroundColor: AppColors.white,
    flex: 1
  }
});
