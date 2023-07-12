import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Column } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { RallyingPointField } from "@/screens/home/HomeHeader";
import { RallyingPoint } from "@/api";

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
    <Column spacing={6}>
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
            //onRequestFocus("from");
            onChangeFrom(undefined);
          } else {
            onChangeFrom(searchFrom);
          }
        }}
        editable={editable}
        placeholder={"Départ"}
        icon={<AppIcon name={"pin"} color={AppColors.orange} />}
        showTrailing={(focused === "from" && (from || (searchFrom && searchFrom.length > 0))) === true}
      />
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
        placeholder={"Arrivée"}
        icon={<AppIcon name={"flag"} color={AppColors.pink} />}
        showTrailing={focused === "to" && (to || (searchTo && searchTo.length > 0)) === true}
      />

      <View style={{ position: "absolute", right: -12, height: "100%", justifyContent: "center" }}>
        <Pressable
          style={[styles.smallActionButton, { backgroundColor: AppColors.darkBlue }]}
          onPress={() => {
            if (!from) {
              setSearchTo(searchFrom);
            }
            if (!to) {
              setSearchFrom(searchTo);
            }
            onValuesSwitched(from, to);
          }}>
          <AppIcon name={"flip-outline"} color={AppColors.white} />
        </Pressable>
      </View>
    </Column>
  );
};

const styles = StyleSheet.create({
  smallActionButton: {
    padding: 8,
    borderRadius: 52
  }
});
