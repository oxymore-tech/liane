import { ColorValue, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { CachedPlaceLocationsView, CachedTripsView, PlaceSuggestions, RallyingPointItem } from "@/screens/ItinerarySearchForm";
import Animated, { SlideInLeft, SlideInUp, SlideOutLeft, SlideOutUp } from "react-native-reanimated";

import { SearchedLocation, Trip } from "@/api/service/location";
import { AppText } from "@/components/base/AppText";
import { AppPressable, AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import Modal from "react-native-modal/dist/modal";
import { AppContext } from "@/components/context/ContextProvider";
import { HomeScreenHeader } from "@/components/context/Navigation";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useSelector } from "@xstate/react";
import { capitalize } from "@/util/strings";
import { formatShortMonthDay, toRelativeDateString } from "@/api/i18n";
import { DatePagerSelector } from "@/components/DatePagerSelector";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { AppTabs } from "@/components/base/AppTabs";
import { useAppNavigation } from "@/api/navigation";

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
          onChangeText={v => onChange(v)}
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
      onChange?: (v: string | undefined) => void;
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
                  if (onChange) {
                    onChange(undefined);
                  }
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
            if (onChange) {
              onChange(v);
            }
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

export const MapHeader = ({
  trip,
  title,
  updateTrip,
  animateEntry = false,
  hintPhrase = null,
  action = null
}: {
  updateTrip: (trip: Partial<Trip>) => void;
  title: string;
  trip: Partial<Trip>;
  animateEntry?: boolean;
  hintPhrase?: string | null;
  action?: { title: string; icon: IconName; onPress: () => void } | null;
}) => {
  //const insets = useSafeAreaInsets();
  const { to, from } = trip;

  const itineraryMarginTop = 0; //24;

  return (
    <View>
      <View style={{ backgroundColor: AppColorPalettes.gray[100], zIndex: 5 }}>
        <HomeScreenHeader label={title} isRootHeader={true} style={{ paddingBottom: 0, minHeight: 0 }} />
        <View style={{ paddingTop: 4 }}>
          <View style={{ position: "absolute", height: 20, bottom: 0, left: 0, right: 0, backgroundColor: AppColors.white }} />
          <Row style={{}}>
            <View style={{ height: 40, backgroundColor: AppColors.white, borderTopRightRadius: 20, paddingRight: 2, paddingTop: 2 }}>
              <FilterSelector shortFormat={true} />
            </View>
            <View style={{ backgroundColor: AppColorPalettes.gray[100], borderBottomLeftRadius: 20, flex: 1, marginLeft: 2 }} />
          </Row>
        </View>
      </View>
      {!to && (
        <Animated.View
          entering={animateEntry ? SlideInUp : undefined}
          exiting={SlideOutUp}
          style={[
            {
              backgroundColor: AppColors.white,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingTop: itineraryMarginTop,
              paddingBottom: 4
            },
            AppStyles.shadow
          ]}>
          <Row style={{ paddingHorizontal: 16, paddingVertical: 2, justifyContent: "center", alignItems: "center" }} spacing={8}>
            <AppIcon name={"info-outline"} />
            <AppText style={{ fontStyle: "italic" }}>{hintPhrase || "Sélectionnez un point d'arrivée"}</AppText>
          </Row>
        </Animated.View>
      )}
      {!!to && (
        <View
          style={[
            {
              backgroundColor: AppColors.white,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingTop: itineraryMarginTop
            },
            AppStyles.shadow
          ]}>
          <View
            style={{
              alignSelf: "center",
              flex: 1,
              borderLeftWidth: 1,
              borderLeftColor: AppColorPalettes.gray[200],
              position: "absolute",
              top: itineraryMarginTop + 32,
              bottom: 32,
              left: 29
            }}
          />

          <Column style={{ paddingRight: 8, paddingLeft: 16 }}>
            <Row style={{ paddingTop: 8, paddingBottom: 4 }} spacing={16}>
              <View
                style={{
                  backgroundColor: AppColorPalettes.gray[100],
                  borderRadius: 32,
                  marginTop: 4,
                  width: 28,
                  height: 28,
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                <AppIcon name={"pin"} color={AppColors.orange} size={24} />
              </View>
              <View style={{ flexShrink: 1, flexGrow: 1, height: 36 }}>
                <RallyingPointItem item={to} labelSize={15} showIcon={false} />
              </View>

              {!from && (
                <AppPressableIcon
                  onPress={() => {
                    updateTrip({ to: undefined });
                  }}
                  name={"close-outline"}
                />
              )}
            </Row>
            <View style={[{ width: "75%" }, styles.horizontalLine]} />
            {!from && (
              <View style={{ paddingVertical: 4, paddingBottom: 8 }}>
                {hintPhrase && <AppText style={{ marginLeft: 40, fontStyle: "italic" }}>{hintPhrase}</AppText>}
                {!hintPhrase && (
                  <Row style={{ alignItems: "center" }} spacing={16}>
                    <View
                      style={{
                        backgroundColor: AppColorPalettes.gray[100],
                        borderRadius: 32,
                        width: 28,
                        height: 28,
                        justifyContent: "center",
                        alignItems: "center"
                      }}>
                      <AppIcon name={"flag"} color={AppColors.pink} size={24} />
                    </View>
                    <AppText style={{ fontStyle: "italic" }}>{"Sélectionnez un point d'arrivée"}</AppText>
                  </Row>
                )}
              </View>
            )}
            {!!from && (
              <Row style={{ paddingTop: 4, paddingBottom: 8 }} spacing={16}>
                <View
                  style={{
                    backgroundColor: AppColorPalettes.gray[100],
                    borderRadius: 32,
                    marginTop: 4,
                    width: 28,
                    height: 28,
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                  <AppIcon name={"flag"} color={AppColors.pink} size={24} />
                </View>
                <View style={{ flexShrink: 1, flexGrow: 1, height: 36 }}>
                  <RallyingPointItem item={from} labelSize={15} showIcon={false} />
                </View>

                <AppPressableIcon
                  onPress={() => {
                    updateTrip({ from: undefined });
                  }}
                  name={"close-outline"}
                />
              </Row>
            )}
          </Column>
        </View>
      )}
      {action && (
        <Animated.View
          style={[
            {
              backgroundColor: AppColors.orange,
              //  alignItems: "flex-start",
              borderBottomRightRadius: 24,
              borderBottomLeftRadius: 24,
              marginHorizontal: 4,
              paddingTop: 16 + 2,
              paddingBottom: 2,
              paddingHorizontal: 4,
              zIndex: -1,
              position: "relative",
              top: -16
            },
            AppStyles.shadow
          ]}>
          <AppPressableOverlay onPress={action.onPress} backgroundStyle={{ borderRadius: 16 }}>
            <Row style={{ alignItems: "center", padding: 8 }} spacing={8}>
              <AppIcon name={action.icon} color={AppColors.white} />
              <AppText style={{ fontWeight: "bold", color: AppColors.white }}>{action.title}</AppText>
            </Row>
          </AppPressableOverlay>
        </Animated.View>
      )}
    </View>
  );
};

export interface FilterSelectorProps {
  formatter?: (d: Date) => string;
  color?: ColorValue;
  shortFormat?: boolean;
}

//const selectAvailableSeats = state => state.context.filter.availableSeats;
const selectTargetTime = (state: any) => state.context.filter.targetTime;
export const FilterSelector = ({ formatter, shortFormat = false, color = defaultTextColor(AppColors.white) }: FilterSelectorProps) => {
  const machine = useContext(HomeMapContext);

  // const availableSeats = useSelector(machine, selectAvailableSeats);
  const targetTime = useSelector(machine, selectTargetTime);

  //  const driver = availableSeats > 0;
  const date = targetTime?.dateTime || new Date();

  const defaultFormatter = shortFormat
    ? (d: Date) => capitalize(toRelativeDateString(d, formatShortMonthDay))!
    : (d: Date) => {
        return targetTime?.direction === "Arrival" ? "Arrivée " : "Départ " + toRelativeDateString(d, formatShortMonthDay);
      };

  return (
    <Row style={{ justifyContent: "center", alignItems: "center", alignSelf: "center", flex: 1, paddingHorizontal: 8 }}>
      {/*<View style={{ paddingHorizontal: 16 }}>
        <SwitchIconToggle
          color={AppColors.blue}
          unselectedColor={AppColorPalettes.gray[200]}
          value={driver}
          onChange={() => {
            machine.send("FILTER", { data: { availableSeats: -availableSeats } });
          }}
          trueIcon={<AppIcon name={"car"} color={driver ? AppColors.white : undefined} size={22} />}
          falseIcon={<AppIcon name={"car-strike-through"} color={!driver ? AppColors.white : undefined} size={22} />}
        />
      </View>*/}
      <DatePagerSelector
        color={color}
        date={date}
        onSelectDate={d => {
          machine.send("FILTER", { data: { targetTime: { ...targetTime, dateTime: new Date(d.toDateString()) } } });
        }}
        formatter={formatter || defaultFormatter}
      />
    </Row>
  );
};

export const SearchModal = (props: {
  onSelectTrip: (trip: Trip) => boolean;
  onSelectFeature: (feature: SearchedLocation) => boolean;
  title?: string;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const { top } = useSafeAreaInsets();
  const { services } = useContext(AppContext);

  const inputRef = useRef<TextInput>();
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setInputText("");
  }, []);
  const { bottom } = useSafeAreaInsets();
  useEffect(() => inputRef.current?.focus());

  return (
    <>
      <Pressable
        style={[styles.smallActionButton, { backgroundColor: AppColors.blue, position: "absolute", bottom: 90 + bottom, left: 16 }, AppStyles.shadow]}
        onPress={() => {
          //machine.send("UPDATE", { data: { to: rallyingPoint } });
          setModalOpen(true);
        }}>
        <AppIcon name={"search-outline"} color={AppColors.white} />
      </Pressable>

      <Modal propagateSwipe isVisible={modalOpen} onSwipeComplete={closeModal} style={styles.modal} onBackButtonPress={() => setModalOpen(false)}>
        <View style={{ height: "100%", paddingTop: top - 2 }}>
          <Row spacing={8}>
            <View style={styles.inputContainer}>
              <AppTextInput
                // @ts-ignore
                ref={inputRef}
                trailing={
                  inputText.length > 0 ? (
                    <Pressable onPress={() => setInputText("")}>
                      <AppIcon name={"close-outline"} color={AppColors.white} />
                    </Pressable>
                  ) : undefined
                }
                value={inputText}
                onChangeText={setInputText}
                style={[AppStyles.input, { fontSize: 18 }]}
                placeholder={"Adresse, point de ralliement..."}
                leading={<AppIcon name={"search-outline"} color={AppColors.white} />}
              />
            </View>
          </Row>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "height" : undefined}>
            <View style={{ height: 16 }} />

            <Column style={{ marginHorizontal: 20 }} spacing={8}>
              <AppTabs
                items={["Lieux", "Trajets récents"]}
                onSelect={setSelectedTab}
                selectedIndex={selectedTab}
                isSelectable={() => true}
                fontSize={16}
              />
            </Column>

            <View style={{ flex: 1 }}>
              {selectedTab === 0 && inputText.length === 0 && (
                <CachedPlaceLocationsView
                  showUsePosition={false}
                  onSelect={async f => {
                    const close = props.onSelectFeature(f);
                    if (close) {
                      closeModal();
                    }
                  }}
                />
              )}
              {selectedTab === 1 && (
                <CachedTripsView
                  filter={inputText.length > 0 ? inputText : undefined}
                  onSelect={t => {
                    const close = props.onSelectTrip(t);
                    if (close) {
                      closeModal();
                    }
                  }}
                />
              )}
              {selectedTab === 0 && inputText.length > 0 && (
                <PlaceSuggestions
                  currentSearch={inputText}
                  onSelect={f => {
                    const close = props.onSelectFeature(f);
                    if (close) {
                      closeModal();
                    }
                    // Cache location
                    services.location.cacheRecentPlaceLocation(f).catch(e => console.warn(e));
                  }}
                />
              )}
            </View>
          </KeyboardAvoidingView>
        </View>

        <FloatingBackButton onPress={closeModal} topOffset={-10} />
      </Modal>
    </>
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
  title: {
    color: AppColors.white,
    ...AppStyles.title,
    paddingVertical: 4
  },
  smallActionButton: {
    padding: 16,
    borderRadius: 52
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
    backgroundColor: AppColors.lightGrayBackground
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexShrink: 1,
    paddingBottom: 16,
    backgroundColor: AppColors.primaryColor,
    alignSelf: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16
  },
  inputContainer: {
    backgroundColor: AppColors.primaryColor,
    borderRadius: 18,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    marginLeft: 80,
    marginRight: 16,
    color: AppColors.white
  },
  inputContainer2: {
    //backgroundColor: AppColors.white,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 32
  },
  horizontalLine: {
    backgroundColor: AppColorPalettes.gray[200],
    height: 1,
    alignSelf: "center"
  }
});
