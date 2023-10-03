import { ColorValue, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View, StyleProp, ViewStyle } from "react-native";
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
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
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
import { UserPicture } from "@/components/UserPicture";
import { TouchableOpacity } from "react-native-gesture-handler";
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
      <View style={styles.inputRallyingPointContainer} pointerEvents={editable ? undefined : "none"}>
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
          style={[AppStyles.input]}
          leading={icon}
          placeholder={placeholder}
          value={value}
          onChangeText={v => onChange(v)}
          onFocus={onFocus}
        />
      </View>
    );

    return editable ? field : <Pressable onPress={() => onFocus()}>{field}</Pressable>;
  }
);

export const MapHeader = ({
  trip,
  title,
  updateTrip,
  animateEntry = false,
  hintPhrase = null,
  action = null,
  style = {}
}: {
  updateTrip: (trip: Partial<Trip>) => void;
  title: string;
  trip: Partial<Trip>;
  animateEntry?: boolean;
  hintPhrase?: string | null;
  action?: { title: string; icon: IconName; onPress: () => void } | null;
  style?: StyleProp<ViewStyle>;
}) => {
  const { to, from } = trip;
  const { user } = useContext(AppContext);
  const { navigation } = useAppNavigation();

  const itineraryMarginTop = 0; //24;

  return (
    <View style={style}>
      {!!to && !!from && <FloatingBackButton onPress={() => updateTrip({ from: undefined })} />}

      {(!to || !from) && (
        <View>
          <View style={{ zIndex: 5 }}>
            <HomeScreenHeader label={title} isRootHeader={true} style={{ paddingBottom: 0, minHeight: 0 }} />
            <View style={{ paddingTop: 4 }}>
              <Row style={styles.headerContainer}>
                <View style={styles.filterContainer}>
                  <FilterSelector color={AppColors.white} shortFormat={true} />
                </View>
                <AppIcon style={{ flex: 1 }} name={"bell"} color={AppColors.white} size={32} />

                <TouchableOpacity
                  style={[AppStyles.center, { borderWidth: 1, borderRadius: 20, borderColor: AppColors.primaryColor }]}
                  onPress={() =>
                    // @ts-ignore
                    navigation.navigate("Profile", { user })
                  }>
                  <UserPicture size={32} url={user?.pictureUrl} id={user?.id} />
                </TouchableOpacity>
              </Row>
            </View>
          </View>

          {(!!to || !!from) && (
            <View style={styles.fromToContainer}>
              <View
                style={{
                  alignSelf: "center",
                  marginVertical: 16,
                  flex: 1,
                  borderLeftWidth: 1,
                  borderLeftColor: AppColorPalettes.gray[200],
                  position: "absolute",
                  top: itineraryMarginTop + 32,
                  bottom: 36,
                  left: 29
                }}
              />

              <Column style={{ paddingRight: 8, paddingLeft: 16 }}>
                {!from && (
                  <View style={{ paddingVertical: 4, paddingBottom: 8 }}>
                    {hintPhrase && <AppText style={{ marginLeft: 40, fontStyle: "italic" }}>{hintPhrase}</AppText>}
                    {!hintPhrase && (
                      <Row style={{ alignItems: "center" }} spacing={16}>
                        <View
                          style={{
                            borderRadius: 32,
                            width: 28,
                            height: 28,
                            justifyContent: "center",
                            alignItems: "center"
                          }}>
                          <AppIcon name={"pin"} color={AppColors.primaryColor} size={18} />
                        </View>
                        <AppText style={{ fontSize: 16, color: AppColors.primaryColor }}>{"Sélectionnez votre départ sur la carte"}</AppText>
                        {!!to && (
                          <AppPressableIcon
                            onPress={() => {
                              updateTrip({ to: from, from: to });
                            }}
                            backgroundStyle={{ backgroundColor: AppColors.primaryColor, borderRadius: 20, height: 36, paddingTop: 9 }}
                            name={"arrow-switch"}
                            size={18}
                          />
                        )}
                      </Row>
                    )}
                  </View>
                )}
                {!!from && (
                  <Row style={{ paddingTop: 4, paddingBottom: 8 }} spacing={16}>
                    <View
                      style={{
                        borderRadius: 32,
                        marginTop: 4,
                        width: 28,
                        height: 28,
                        justifyContent: "center",
                        alignItems: "center"
                      }}>
                      <AppIcon name={"pin"} color={AppColors.primaryColor} size={18} />
                    </View>
                    <View style={{ flexShrink: 1, flexGrow: 1, height: 36 }}>
                      <RallyingPointItem item={from} labelSize={15} showIcon={false} />
                    </View>

                    <AppPressableIcon
                      backgroundStyle={{ marginRight: 12 }}
                      onPress={() => {
                        updateTrip({ from: undefined });
                      }}
                      name={"close-outline"}
                      size={32}
                      borderRadius={8}
                    />
                  </Row>
                )}
                <Row style={{ paddingTop: 8, paddingBottom: 4 }} spacing={16}>
                  <View
                    style={{
                      borderRadius: 32,
                      marginTop: 4,
                      width: 28,
                      height: 28,
                      justifyContent: "center",
                      alignItems: "center"
                    }}>
                    <AppIcon name={"flag"} color={AppColors.primaryColor} size={18} />
                  </View>
                  <View style={{ flexShrink: 1, flexGrow: 1, height: 36 }}>
                    {!!to && <RallyingPointItem item={to} labelSize={15} showIcon={false} />}
                    {!to && (
                      <Row style={{ alignItems: "center", flexGrow: 1 }} spacing={8}>
                        <AppText style={{ fontSize: 16, color: AppColors.primaryColor }}>
                          {hintPhrase || "Sélectionnez votre arrivée sur la carte"}
                        </AppText>
                        <AppPressableIcon
                          onPress={() => {
                            updateTrip({ to: from, from: to });
                          }}
                          backgroundStyle={{ backgroundColor: AppColors.primaryColor, borderRadius: 20, height: 36, paddingTop: 9 }}
                          name={"arrow-switch"}
                          size={18}
                        />
                      </Row>
                    )}
                  </View>

                  {!from && (
                    <AppPressableIcon
                      backgroundStyle={{ marginRight: 12 }}
                      onPress={() => {
                        updateTrip({ to: undefined });
                      }}
                      name={"close-outline"}
                      size={32}
                      borderRadius={8}
                    />
                  )}
                </Row>
              </Column>
            </View>
          )}

          {!to && !from && (
            <Animated.View
              entering={animateEntry ? SlideInUp : undefined}
              exiting={SlideOutUp}
              style={[styles.selectArrivalContainer, AppStyles.shadow]}>
              <Row style={{ paddingHorizontal: 16, paddingVertical: 2, alignItems: "center", height: 50 }} spacing={8}>
                <AppIcon name={"flag"} color={AppColors.primaryColor} size={16} />
                <AppText style={{ fontSize: 16, color: AppColors.primaryColor }}>{hintPhrase || "Sélectionnez votre arrivée sur la carte"}</AppText>
              </Row>
            </Animated.View>
          )}
          {action && (
            <Animated.View
              style={[
                {
                  backgroundColor: AppColors.primaryColor,
                  borderBottomRightRadius: 24,
                  borderBottomLeftRadius: 24,
                  marginHorizontal: 8,
                  paddingTop: 8,
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
      <DatePagerSelector
        color={color}
        date={date}
        onSelectDate={d => machine.send("FILTER", { data: { targetTime: { ...targetTime, dateTime: new Date(d.toDateString()) } } })}
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
  useEffect(() => inputRef.current?.focus(), [modalOpen]);

  return (
    <>
      <Pressable
        style={[
          styles.smallActionButton,
          { backgroundColor: AppColors.primaryColor, position: "absolute", bottom: 90 + bottom, left: 16 },
          AppStyles.shadow
        ]}
        onPress={() => setModalOpen(true)}>
        <AppIcon name={"search-outline"} color={AppColors.white} />
      </Pressable>

      <Modal propagateSwipe isVisible={modalOpen} onSwipeComplete={closeModal} style={styles.modal} onBackButtonPress={() => setModalOpen(false)}>
        <View style={{ height: "100%", paddingTop: top }}>
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
                placeholder={"Adresse, point de ralliement..."}
                placeholderTextColor={AppColors.white}
                textColor={AppColors.white}
                style={AppStyles.input}
                leading={<AppIcon name={"search-outline"} color={AppColors.white} />}
              />
            </View>
          </Row>
          <View style={{ flex: 1, marginTop: 16 }}>
            <Column style={{ marginHorizontal: 20 }} spacing={8}>
              <AppTabs
                items={["Lieux", "Trajets récents"]}
                onSelect={setSelectedTab}
                selectedIndex={selectedTab}
                isSelectable={() => true}
                fontSize={16}
              />
            </Column>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "height" : undefined}>
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
            </KeyboardAvoidingView>
          </View>
        </View>

        <FloatingBackButton onPress={closeModal} topOffset={-6} />
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
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 8,
    marginRight: 16
  },
  filterContainer: {
    height: 50,
    backgroundColor: AppColors.primaryColor,
    borderRadius: 18,
    paddingVertical: 4,
    paddingLeft: 4
  },
  selectArrivalContainer: {
    marginTop: 8,
    marginHorizontal: 8,
    backgroundColor: AppColors.white,
    borderRadius: 16,
    paddingBottom: 2
  },
  fromToContainer: {
    margin: 8,
    paddingVertical: 12,
    backgroundColor: AppColors.white,
    borderRadius: 18
  },
  inputContainer: {
    borderRadius: 18,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 76,
    color: AppColors.white,
    height: 50,
    backgroundColor: AppColors.primaryColor
  },
  inputRallyingPointContainer: {
    borderRadius: 18,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    height: 42,
    color: AppColors.white
  },
  horizontalLine: {
    backgroundColor: AppColorPalettes.gray[200],
    height: 1,
    alignSelf: "center"
  }
});
