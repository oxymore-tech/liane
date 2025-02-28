import React, { useEffect, useRef, useState } from "react";
import { StyleProp, TextInput, View, ViewStyle } from "react-native";
import { Column } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { RallyingPoint } from "@liane/common";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { ToOrFrom } from "@/components/trip/ItineraryFormHeader.tsx";
import { RallyingPointField } from "@/components/forms/fields/RallyingPointField.tsx";

export type ItineraryFormProps = {
  editable?: boolean;
  field?: ToOrFrom;
  onChangeFrom?: (value: string) => void;
  onChangeTo?: (value: string) => void;
  onRequestFocus?: (field: ToOrFrom) => void;
  to: RallyingPoint | undefined;
  from: RallyingPoint | undefined;
  onValuesSwitched: (oldFrom: RallyingPoint | undefined, oldTo: RallyingPoint | undefined) => void;
  style?: StyleProp<ViewStyle>;
};

export const ItineraryForm = ({
  from,
  to,
  field,
  style,
  onValuesSwitched = () => {},
  onChangeFrom = () => {},
  onChangeTo = () => {},
  onRequestFocus = () => {},
  editable = true
}: ItineraryFormProps) => {
  const [searchFrom, setSearchFrom] = useState<string>("");
  const [searchTo, setSearchTo] = useState<string>("");
  const inputRefFrom = useRef<TextInput>(null);
  const inputRefTo = useRef<TextInput>(null);

  useEffect(() => {
    if (to) {
      if (!from) {
        inputRefFrom.current?.focus();
        return;
      }
    } else {
      inputRefTo.current?.focus();
      return;
    }
    if (from) {
      if (!to) {
        inputRefTo.current?.focus();
        return;
      }
    }
  }, [from, to]);

  return (
    <Column style={style}>
      <RallyingPointField
        ref={inputRefFrom}
        onChange={v => {
          setSearchFrom(v);
          onChangeFrom(v);
        }}
        value={from?.label || searchFrom || ""}
        info={from?.city}
        onFocus={() => {
          onRequestFocus("from");
        }}
        editable={editable}
        placeholder="D'où partez vous ?"
        icon={<AppIcon name="pin" color={AppColors.primaryColor} />}
        showTrailing={(field === "from" && (from || (searchFrom && searchFrom.length > 0))) === true}
      />
      <RallyingPointField
        ref={inputRefTo}
        onChange={v => {
          setSearchTo(v);
          onChangeTo(v);
        }}
        value={to?.label || searchTo || ""}
        info={to?.city}
        onFocus={() => {
          onRequestFocus("to");
        }}
        editable={editable}
        placeholder="Où allez-vous ?"
        icon={<AppIcon name="flag" color={AppColors.primaryColor} />}
        showTrailing={field === "to" && (to || (searchTo && searchTo.length > 0)) === true}
      />
      {(to || from) && (
        <View style={{ position: "absolute", right: 0, top: 6, height: "100%", justifyContent: "center" }}>
          <AppPressableIcon
            name="arrow-switch"
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
