import { ColorValue, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { CachedLocationsView, CachedTripsView, PlaceSuggestions, RallyingPointItem } from "@/screens/ItinerarySearchForm";
import Animated, { SlideInLeft, SlideInUp, SlideOutLeft, SlideOutUp } from "react-native-reanimated";
import { FloatingBackButton } from "@/screens/detail/Components";
import { Trip } from "@/api/service/location";
import { FilterSelector } from "@/screens/home/BottomSheetView";
import { AppText } from "@/components/base/AppText";
import { useAppBackController } from "@/components/AppBackContextProvider";
import { AppPressableIcon } from "@/components/base/AppPressable";
import Modal from "react-native-modal/dist/modal";
import { Feature } from "geojson";
import { AppStatusBar } from "@/components/base/AppStatusBar";

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
            <AppIcon name={hintPhrase ? "info-outline" : "pin"} color={hintPhrase ? undefined : AppColors.orange} />
            <AppText style={{ fontStyle: "italic" }}>{hintPhrase || "Sélectionnez un point de ralliement"}</AppText>
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
            <View style={[{ width: "72%" }, styles.line]} />
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

export const SearchFeature = (props: { onSelect: (feature: Feature) => boolean; title?: string }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const { top } = useSafeAreaInsets();
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setInputText("");
  }, []);
  return (
    <>
      <Pressable
        style={[styles.smallActionButton, { backgroundColor: AppColors.blue, position: "absolute", bottom: 90, left: 16 }, AppStyles.shadow]}
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
            <View style={{ flex: 1, marginTop: 16 }}>
              {inputText.length === 0 && (
                <CachedLocationsView
                  //exceptValues={[]}
                  showUsePosition={false}
                  onSelect={async rp => {
                    // updateTrip({ [currentPoint]: rp });
                    const close = props.onSelect({
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [rp.location.lng, rp.location.lat] },
                      properties: { ...rp },
                      place_type: ["rallying_point"]
                    });
                    if (close) {
                      closeModal();
                    }
                  }}
                />
              )}
              {inputText.length > 0 && (
                <PlaceSuggestions
                  currentSearch={inputText}
                  onSelect={f => {
                    const close = props.onSelect(f);
                    if (close) {
                      closeModal();
                    }
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
  line: {
    borderBottomColor: AppColorPalettes.gray[200],
    borderBottomWidth: 1,
    alignSelf: "center"
  }
});
