import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { RallyingPoint } from "@/api";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointItem } from "@/screens/home/ItinerarySearchForm";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";

export interface ItineraryFormHeaderProps {
  editable?: boolean;
  onChangeFrom?: (value: string | undefined) => void;
  onChangeTo?: (value: string | undefined) => void;
  onBackPressed?: () => void;
}

export const ItineraryFormHeader = ({ onChangeFrom = () => {}, onChangeTo = () => {}, onBackPressed, editable = true }: ItineraryFormHeaderProps) => {
  const insets = useSafeAreaInsets();
  const [searchFrom, setSearchFrom] = useState<string>();
  const [searchTo, setSearchTo] = useState<string>();
  const [focused, setFocused] = useState<"from" | "to" | undefined>();
  const inputRefFrom = useRef<TextInput>(null);
  const inputRefTo = useRef<TextInput>(null);

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { to, from } = state.context.filter;
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
  }, [from, to, inputRefFrom, inputRefTo, searchFrom, searchTo]);

  return (
    <Animated.View
      style={[styles.footerContainer, AppStyles.shadow, { paddingTop: insets.top + 8 }]}
      // entering={SlideInUp} exiting={SlideOutUp}
    >
      <Column spacing={8}>
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
        <Column spacing={6}>
          <View style={styles.inputContainer}>
            <AppTextInput
              trailing={
                focused === "from" && (from || (searchFrom && searchFrom.length > 0)) ? (
                  <Pressable
                    style={{ marginRight: 12 }}
                    onPress={() => {
                      inputRefFrom.current?.clear();
                      setSearchFrom(undefined);
                      onChangeFrom(undefined);
                      inputRefFrom.current?.focus();
                    }}>
                    <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
                  </Pressable>
                ) : undefined
              }
              ref={inputRefFrom}
              editable={editable}
              onPressIn={
                editable || Platform.OS === "android"
                  ? undefined
                  : () =>
                      onChangeFrom(
                        undefined
                      ) /* This fixes onPressIn event not fired if editable set to false in Android : see https://github.com/facebook/react-native/issues/33649 */
              }
              onTouchEnd={editable || Platform.OS === "ios" ? undefined : () => onChangeFrom(undefined)}
              style={AppStyles.input}
              leading={<AppIcon name={"pin"} color={AppColors.orange} />}
              placeholder={"Départ"}
              value={from?.label || searchFrom}
              onChangeText={v => {
                setSearchFrom(v);
                onChangeFrom(v);
              }}
              onFocus={() => {
                setFocused("from");
                onChangeFrom(searchFrom);
              }}
            />
          </View>
          <View style={styles.inputContainer}>
            <AppTextInput
              trailing={
                focused === "to" && (to || (searchTo && searchTo.length > 0)) ? (
                  <Pressable
                    style={{ marginRight: 12 }}
                    onPress={() => {
                      inputRefTo.current?.clear();
                      setSearchTo(undefined);
                      onChangeTo(undefined);
                      inputRefTo.current?.focus();
                    }}>
                    <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
                  </Pressable>
                ) : undefined
              }
              ref={inputRefTo}
              editable={editable}
              onPressIn={
                editable || Platform.OS === "android"
                  ? undefined
                  : () =>
                      onChangeTo(
                        undefined
                      ) /* This fixes onPressIn event not fired if editable set to false in Android : see https://github.com/facebook/react-native/issues/33649 */
              }
              onTouchEnd={editable || Platform.OS === "ios" ? undefined : () => onChangeTo(undefined)}
              style={AppStyles.input}
              leading={<AppIcon name={"flag"} color={AppColors.pink} />}
              placeholder={"Arrivée"}
              value={to?.label || searchTo}
              onChangeText={v => {
                setSearchTo(v);
                onChangeTo(v);
              }}
              onFocus={() => {
                setFocused("to");
                onChangeTo(searchTo);
              }}
            />
          </View>

          <View style={{ position: "absolute", right: -12, height: "100%", justifyContent: "center" }}>
            <Pressable
              style={[styles.smallActionButton, { backgroundColor: AppColors.darkBlue }]}
              onPress={() => {
                if (!from) {
                  setSearchTo(undefined);
                }
                if (!to) {
                  setSearchFrom(undefined);
                }
                machine.send("UPDATE", { data: { from: to, to: from } });
              }}>
              <AppIcon name={"flip-outline"} color={AppColors.white} />
            </Pressable>
          </View>
        </Column>
      </Column>
    </Animated.View>
  );
};

export const HomeHeader = (props: { onPress: () => void }) => {
  const insets = useSafeAreaInsets();
  /* const { navigation } = useAppNavigation();
  const navigateToSearch = () => {
    navigation.navigate("Search");
  };*/
  return (
    <View style={[styles.floatingSearchBar, { marginTop: insets.top }]}>
      <Pressable style={AppStyles.inputBar} onPress={props.onPress}>
        <AppTextInput
          style={AppStyles.input}
          leading={<AppIcon name={"search-outline"} color={AppColorPalettes.gray[400]} />}
          editable={false}
          placeholder={"Trouver une Liane"}
          onPressIn={props.onPress}
        />
      </Pressable>
    </View>
  );
};

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

export const FloatingBackButton = (props: { onPress: () => void }) => {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={[styles.floatingBackButton, styles.actionButton, { marginTop: 24 + insets.top }]}
      onPress={() => {
        props.onPress();
      }}>
      <AppIcon name={"arrow-ios-back-outline"} color={AppColors.white} />
    </Pressable>
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
  smallActionButton: {
    padding: 8,
    borderRadius: 52
  },
  floatingBackButton: {
    margin: 24,
    position: "absolute",
    backgroundColor: AppColors.darkBlue
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
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  }
});
