import { ColorValue, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { CachedPlaceLocationsView, CachedTripsView, PlaceSuggestions, RallyingPointItem } from "@/screens/ItinerarySearchForm";
import Animated, { SlideInLeft, SlideInUp, SlideOutLeft, SlideOutUp } from "react-native-reanimated";
import { FloatingBackButton } from "@/screens/detail/Components";
import { SearchedLocation, Trip } from "@/api/service/location";
import { AppText } from "@/components/base/AppText";
import { useAppBackController } from "@/components/AppBackContextProvider";
import { AppPressable, AppPressableIcon } from "@/components/base/AppPressable";
import Modal from "react-native-modal/dist/modal";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { AppContext } from "@/components/ContextProvider";
import { HomeScreenHeader } from "@/components/Navigation";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useSelector } from "@xstate/react";
import { capitalize } from "@/util/strings";
import { formatShortMonthDay, toRelativeDateString } from "@/api/i18n";
import { DatePagerSelector } from "@/components/DatePagerSelector";

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
  hintPhrase = null
}: {
  updateTrip: (trip: Partial<Trip>) => void;
  title: string;

  trip: Partial<Trip>;
  animateEntry?: boolean;
  hintPhrase?: string | null;
}) => {
  //const insets = useSafeAreaInsets();
  const { to, from } = trip;

  const itineraryMarginTop = 0; //24;

  return (
    <View style={{ backgroundColor: AppColorPalettes.gray[100] }}>
      <HomeScreenHeader label={title} isRootHeader={true} style={{ paddingBottom: 0, minHeight: 0 }} />
      <View style={{ paddingTop: 4, zIndex: 5 }}>
        <View style={{ position: "absolute", height: 20, bottom: 0, left: 0, right: 0, backgroundColor: AppColors.white }} />
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ height: 40, backgroundColor: AppColors.white, borderTopRightRadius: 32, paddingRight: 2, paddingTop: 2 }}>
            <FilterSelector shortFormat={true} />
          </View>
          <View style={{ backgroundColor: AppColorPalettes.gray[100], borderBottomLeftRadius: 40, flex: 1, marginLeft: 2 }} />
        </Row>
      </View>
      {!from && (
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
            <AppText style={{ fontStyle: "italic" }}>{hintPhrase || "Sélectionnez un point de départ"}</AppText>
          </Row>
        </Animated.View>
      )}
      {!!from && (
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
                <RallyingPointItem item={from} labelSize={15} showIcon={false} />
              </View>

              {!to && (
                <AppPressableIcon
                  onPress={() => {
                    updateTrip({ from: undefined });
                  }}
                  name={"close-outline"}
                />
              )}
            </Row>
            <View style={[{ width: "75%" }, styles.horizontalLine]} />
            {!to && (
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
            {!!to && (
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
                  <RallyingPointItem item={to} labelSize={15} showIcon={false} />
                </View>

                <AppPressableIcon
                  onPress={() => {
                    updateTrip({ to: undefined });
                  }}
                  name={"close-outline"}
                />
              </Row>
            )}
          </Column>
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

export const RPFormHeader = ({
  trip,
  title,
  animateEntry = true,
  updateTrip,
  canGoBack = false,
  hintPhrase = null,
  setBarVisible
}: {
  updateTrip: (trip: Partial<Trip>) => void;
  title?: string;
  animateEntry?: boolean;
  trip: Partial<Trip>;
  canGoBack?: boolean;
  setBarVisible?: (visible: boolean) => void;
  hintPhrase?: string | null;
}) => {
  const insets = useSafeAreaInsets();

  const { to, from } = trip;
  const { goBack } = useAppBackController();
  const [showHistory, setShowHistory] = useState(false);
  const itineraryMarginTop = insets.top + 92;

  useEffect(() => {
    if (setBarVisible) {
      setBarVisible(!showHistory);
    }
  }, [showHistory]);

  return (
    <Animated.View style={showHistory ? { flex: 1 } : undefined} entering={animateEntry ? SlideInUp : undefined} exiting={SlideOutUp}>
      <AppStatusBar style="light-content" />

      {!from && !showHistory && (
        <Animated.View
          entering={animateEntry ? SlideInUp : undefined}
          exiting={SlideOutUp}
          style={[
            {
              backgroundColor: AppColorPalettes.gray[100],
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingTop: itineraryMarginTop
            },
            AppStyles.shadow
          ]}>
          <Row style={{ paddingHorizontal: 16, paddingVertical: 2, justifyContent: "center", alignItems: "center" }} spacing={8}>
            <AppIcon name={"info-outline"} />
            <AppText style={{ fontStyle: "italic" }}>{hintPhrase || "Sélectionnez un point de départ"}</AppText>
          </Row>
        </Animated.View>
      )}
      {!!from && !to && (
        <View
          style={[
            {
              backgroundColor: AppColorPalettes.gray[100],
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingTop: itineraryMarginTop
            },
            AppStyles.shadow
          ]}>
          <Column>
            <Row style={{ paddingVertical: 8, paddingHorizontal: 8 }} spacing={16}>
              <View style={{ paddingVertical: 8 }}>
                <AppIcon name={"pin"} color={AppColors.orange} size={32} />
              </View>
              <View style={{ flexShrink: 1, flexGrow: 1 }}>
                <RallyingPointItem item={from} labelSize={18} showIcon={false} />
              </View>

              <AppPressableIcon
                onPress={() => {
                  updateTrip({ from: undefined });
                }}
                name={"close-outline"}
              />
            </Row>
            <View style={[{ width: "72%" }, styles.horizontalLine]} />
            <View style={{ paddingVertical: 4, paddingLeft: 16, paddingBottom: 8 }}>
              {hintPhrase && <AppText style={{ marginLeft: 40, fontStyle: "italic" }}>{hintPhrase}</AppText>}
              {!hintPhrase && (
                <Row style={{ alignItems: "center" }} spacing={16}>
                  <AppIcon name={"flag"} color={AppColors.pink} />
                  <AppText style={{ fontStyle: "italic" }}>{"Sélectionnez un point d'arrivée"}</AppText>
                </Row>
              )}
            </View>
          </Column>
        </View>
      )}
      {!!from && !!to && (
        <View
          style={[
            {
              backgroundColor: AppColorPalettes.gray[100],
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingTop: itineraryMarginTop
            },
            AppStyles.shadow
          ]}>
          <Column style={{ paddingVertical: 4, paddingHorizontal: 24 }}>
            <Row style={{ paddingVertical: 8, alignItems: "center" }} spacing={16}>
              <AppIcon name={"pin"} color={AppColors.orange} />
              <AppText style={[{ fontSize: 16 }]}>{from.label}</AppText>
            </Row>
            <Row style={{ paddingVertical: 8, alignItems: "center" }} spacing={16}>
              <AppIcon name={"flag"} color={AppColors.pink} />
              <AppText style={[{ fontSize: 16 }]}>{to.label}</AppText>
            </Row>
          </Column>
          <View style={{ position: "absolute", top: itineraryMarginTop + 24, right: 16 }}>
            <AppPressableIcon name={"flip-outline"} onPress={() => updateTrip({ to: from, from: to })} />
          </View>
        </View>
      )}
      {/*!showHistory && (
        <View
          style={[
            {
              backgroundColor: AppColorPalettes.gray[100],
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingTop: itineraryMarginTop
            },
            AppStyles.shadow
          ]}>
          <Column style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <Row style={{ alignItems: "center" }}>
              {!!from && !to && (
                <AppPressableIcon
                  onPress={() => {
                    updateTrip({ from: undefined });
                  }}
                  name={"close-outline"}
                />
              )}
              <View style={{ flex: 1, marginLeft: to ? 36 : 0 }}>
                <RallyingPointField2
                  icon={<AppIcon name={"pin"} color={AppColors.orange} />}
                  value={from?.label || ""}
                  placeholder={"Sélectionnez un point de ralliement"}
                  showTrailing={false}
                  editable={false}
                />
              </View>
              {!from && (
                <AppPressableIcon
                  onPress={() => {
                    setShowHistory(true);
                  }}
                  name={"history"}
                />
              )}
            </Row>
            {from && (
              <View
                style={{ alignSelf: "flex-start", height: 8, marginLeft: 15 + 36, borderLeftWidth: 1, borderLeftColor: AppColorPalettes.gray[200] }}
              />
            )}
            {from && (
              <Row style={{ alignItems: "center" }}>
                {!!to && (
                  <AppPressableIcon
                    onPress={() => {
                      updateTrip({ to: undefined });
                    }}
                    name={"close-outline"}
                  />
                )}
                <View style={{ flex: 1, marginLeft: to ? 0 : 36 }}>
                  <RallyingPointField2
                    icon={<AppIcon name={"flag"} color={AppColors.pink} />}
                    value={to?.label || ""}
                    placeholder={"Sélectionnez un point d'arrivée"}
                    showTrailing={false}
                    editable={false}
                  />
                </View>
              </Row>
            )}
          </Column>
        </View>
      )*/}
      {showHistory && (
        <Column style={{ backgroundColor: AppColors.white, paddingTop: itineraryMarginTop, flex: 1 }}>
          <CachedTripsView
            onSelect={t => {
              updateTrip(t);
            }}
          />
          <View style={{ position: "absolute", top: itineraryMarginTop + 4, right: 16 }}>
            <AppPressableIcon
              onPress={() => {
                setShowHistory(false);
              }}
              name={"close-outline"}
            />
          </View>
        </Column>
      )}

      <View style={[styles.headerContainer, AppStyles.shadow, { paddingTop: insets.top + 4, paddingBottom: 8 }]}>
        <Column>
          <Row style={{ alignItems: "center", marginBottom: (title ? 4 : 0) + 8 }} spacing={16}>
            {!canGoBack && <View style={{ flex: 1 }} />}

            {canGoBack && (
              <AppPressableIcon
                onPress={() => {
                  goBack();
                }}
                name={"arrow-ios-back-outline"}
                size={24}
                color={AppColors.white}
              />
            )}
            {title && <AppText style={styles.title}>{title}</AppText>}
            <View style={{ flex: 1 }} />
          </Row>

          <Row style={{ alignItems: "center", paddingHorizontal: 8, marginRight: 8 }}>
            <AppText style={{ color: AppColors.white, fontWeight: "bold" }}>Départ: </AppText>
            <View style={{ flex: 1 }} />
            <FilterSelector shortFormat={true} />
          </Row>
        </Column>
      </View>
    </Animated.View>
  );
};

/*export const RallyingPointHeader = ({ onBackPressed, rallyingPoint }: { rallyingPoint: RallyingPoint; onBackPressed?: () => void }) => {
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
};*/

export const SearchModal = (props: {
  onSelectTrip: (trip: Trip) => boolean;
  onSelectFeature: (feature: SearchedLocation) => boolean;
  title?: string;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTrips, setSearchTrips] = useState(false);
  const [inputText, setInputText] = useState("");
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
      <Modal propagateSwipe isVisible={modalOpen} onSwipeComplete={closeModal} style={styles.modal}>
        <View style={{ backgroundColor: AppColors.white, padding: 16, height: "100%", paddingTop: 16 + top }}>
          <Row style={{ marginBottom: 16, alignItems: "center" }} spacing={8}>
            <AppPressableIcon onPress={closeModal} name={"close-outline"} />

            <AppText style={{ fontSize: 18, fontWeight: "500" }}>{props.title || "Rechercher"}</AppText>
          </Row>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "height" : undefined}>
            <View style={styles.inputContainer}>
              <AppTextInput
                // @ts-ignore
                ref={inputRef}
                trailing={
                  inputText.length > 0 ? (
                    <Pressable
                      onPress={() => {
                        setInputText("");
                      }}>
                      <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
                    </Pressable>
                  ) : undefined
                }
                value={inputText}
                onChangeText={setInputText}
                style={[AppStyles.input, { fontSize: 16 }]}
                placeholder={"Adresse, point de ralliement..."}
                leading={<AppIcon name={"search-outline"} />}
              />
            </View>
            <View style={{ height: 16 }} />
            <Row style={{ marginHorizontal: 8 }} spacing={8}>
              {["Lieux", "Trajets passés"].map((e, i) => (
                <AppPressable onPress={() => setSearchTrips(i === 1)}>
                  <View
                    style={{
                      backgroundColor: i === (searchTrips ? 1 : 0) ? AppColors.darkBlue : undefined,
                      borderWidth: 1,
                      borderColor: i !== (searchTrips ? 1 : 0) ? AppColors.darkBlue : "transparent",
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 16
                    }}>
                    <AppText style={{ color: i === (searchTrips ? 1 : 0) ? AppColors.white : AppColors.darkBlue }}>{e}</AppText>
                  </View>
                </AppPressable>
              ))}
            </Row>
            <View style={{ flex: 1 }}>
              {!searchTrips && inputText.length === 0 && (
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
              {searchTrips && (
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
              {!searchTrips && inputText.length > 0 && (
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
  title: { color: AppColors.white, ...AppStyles.title, paddingVertical: 4 },
  smallActionButton: {
    padding: 16,
    borderRadius: 52
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0
  },

  headerContainer: {
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
    minHeight: 40
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
