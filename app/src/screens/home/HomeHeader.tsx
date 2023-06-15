import { ColorValue, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import React, { forwardRef, useContext, useImperativeHandle, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { RallyingPoint } from "@/api";
import LocationPin from "@/assets/location_pin.svg";
import { CachedTripsView, RallyingPointItem } from "@/screens/ItinerarySearchForm";
import { HomeMapContext } from "@/screens/home/StateMachine";
import Animated, { SlideInLeft, SlideInUp, SlideOutLeft, SlideOutUp } from "react-native-reanimated";
import { FloatingBackButton } from "@/screens/detail/Components";
import { ItineraryFormHeader } from "@/components/trip/ItineraryFormHeader";
import { Trip } from "@/api/service/location";
import { FilterSelector } from "@/screens/home/BottomSheetView";
import { AppText } from "@/components/base/AppText";
import { ItineraryForm } from "@/components/forms/ItineraryForm";
import { useAppBackController } from "@/components/AppBackContextProvider";
import { RallyingPointInput } from "@/components/RallyingPointInput";
import { AppPressableOverlay } from "@/components/base/AppPressable";

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

export const RallyingPointField2 = forwardRef(
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
      <View style={styles.inputContainer2} pointerEvents={editable ? undefined : "none"}>
        <AppTextInput
          trailing={
            showTrailing ? (
              <Pressable
                style={{ marginRight: 0 }}
                onPress={() => {
                  if (editable) {
                    inputRef.current?.clear();
                  }
                  onChange(undefined);
                  if (editable) {
                    inputRef.current?.focus();
                  }
                }}>
                <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
              </Pressable>
            ) : undefined
          }
          ref={inputRef}
          editable={editable}
          selection={editable ? undefined : { start: 0 }}
          style={[AppStyles.input, { fontSize: 16 }]}
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

export const RPFormHeader = ({
  trip,
  title,
  animateEntry = true,
  updateTrip,
  canGoBack = false,
  onRequestFocus
}: {
  updateTrip: (trip: Partial<Trip>) => void;
  title?: string;
  animateEntry?: boolean;
  trip: Partial<Trip>;
  canGoBack?: boolean;
  onRequestFocus?: () => void;
}) => {
  const insets = useSafeAreaInsets();

  const { to, from } = trip;
  const { goBack } = useAppBackController();
  const [showHistory, setShowHistory] = useState(false);
  //
  return (
    <Animated.View style={showHistory ? { flex: 1 } : undefined} entering={animateEntry ? SlideInUp : undefined} exiting={SlideOutUp}>
      {!showHistory && (
        <View
          style={[
            {
              backgroundColor: AppColorPalettes.gray[100],
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingTop: 108
            },
            AppStyles.shadow
          ]}>
          <Column style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <Row style={{ alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <RallyingPointField2
                  icon={<AppIcon name={"pin"} color={AppColors.orange} />}
                  value={from?.label || ""}
                  placeholder={"Sélectionnez un point de départ"}
                  showTrailing={!!from && !to}
                  onChange={() => {
                    updateTrip({ from: undefined });
                  }}
                />
              </View>
              {!from && (
                <Pressable
                  onPress={() => {
                    setShowHistory(true);
                  }}>
                  <AppIcon name={"history"} />
                </Pressable>
              )}
            </Row>
            {from && (
              <View style={{ alignSelf: "flex-start", height: 8, marginLeft: 15, borderLeftWidth: 1, borderLeftColor: AppColorPalettes.gray[200] }} />
            )}
            {from && (
              <RallyingPointField2
                icon={<AppIcon name={"flag"} color={AppColors.pink} />}
                value={to?.label || ""}
                placeholder={"Sélectionnez un point d'arrivée"}
                showTrailing={!!to}
                onChange={() => {
                  updateTrip({ to: undefined });
                }}
              />
            )}
          </Column>
        </View>
      )}
      {showHistory && (
        <Column style={{ backgroundColor: AppColors.white, paddingTop: 108, flex: 1, paddingBottom: 92 }}>
          <CachedTripsView
            onSelect={t => {
              updateTrip(t);
            }}
          />
          <View style={{ position: "absolute", top: 116, right: 16 }}>
            <Pressable
              onPress={() => {
                setShowHistory(false);
              }}>
              <AppIcon name={"close-outline"} />
            </Pressable>
          </View>
        </Column>
      )}
      <View style={[styles.footerContainer, AppStyles.shadow, { paddingTop: insets.top + 4, paddingBottom: 8 }]}>
        <Column>
          <Row style={{ alignItems: "center", marginBottom: (title ? 4 : 0) + 8 }} spacing={16}>
            {canGoBack && (
              <Pressable
                onPress={() => {
                  goBack();
                }}>
                <AppIcon name={"arrow-ios-back-outline"} size={24} color={AppColors.white} />
              </Pressable>
            )}
            {title && <AppText style={styles.title}>{title}</AppText>}
            <View style={{ flex: 1 }} />
            {onRequestFocus && (
              <Pressable onPress={onRequestFocus}>
                <AppIcon color={AppColors.white} name={"search-outline"} />
              </Pressable>
            )}
          </Row>

          <Row style={{ alignItems: "center", paddingHorizontal: 8 }}>
            <AppText style={{ color: AppColors.white, fontWeight: "bold" }}>Départ: </AppText>
            <View style={{ flex: 1 }} />
            <FilterSelector shortFormat={true} />
          </Row>
        </Column>
      </View>
    </Animated.View>
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
  title: { color: AppColors.white, ...AppStyles.title, paddingVertical: 4 },
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
    //flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36
  },
  inputContainer2: {
    //backgroundColor: AppColors.white,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 32
  }
});
