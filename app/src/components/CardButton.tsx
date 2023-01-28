import React, { useEffect, useState } from "react";
import { ColorValue, GestureResponderEvent, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppDimensions } from "@/theme/dimensions";
import { AppIcon } from "@/components/base/AppIcon";
import { AppPressable } from "@/components/base/AppPressable";
import { Row } from "@/components/base/AppLayout";

// @ts-ignore
export interface LianeCardProps extends PressableProps {
  label?: string;
  value: string;
  onCancel?: () => void;
  color?: ColorValue;
  textColor?: ColorValue;
  extendedView?: JSX.Element;
  useOkButton?: boolean;
  onCloseExtendedView?: (isOk: boolean) => void;
  showPopup?: boolean;
}

const CancelButton = ({ color, label, onCancel }) => {
  const cancelColor = color === AppColors.white ? AppColorPalettes.blue[500] : AppColors.white;
  const cancelIconColor = cancelColor === AppColors.white ? AppColorPalettes.gray[800] : AppColors.white;
  const positionStyleOverride = label ? {} : { right: -12 };

  return (
    <AppPressable
      style={styles.cancelContainer}
      backgroundStyle={[styles.cancelPressable, { backgroundColor: cancelColor }, positionStyleOverride]}
      onPress={onCancel}>
      <AppIcon name="close-outline" color={cancelIconColor} />
    </AppPressable>
  );
};

const CardModal = ({ x, y, children, onClosed, color, useOkButton, onClose }) => {
  const { height, width } = useWindowDimensions();

  const animState = useSharedValue(0);
  const centerX = useSharedValue(x);
  const centerY = useSharedValue(y);

  const duration = 320;

  const margin = 8;
  const insets = useSafeAreaInsets();

  const textColor = defaultTextColor(color);

  const [showContent, setShowContent] = useState(false);
  const [closing, setClosing] = useState(false);

  const closeModal = (validate: boolean) => {
    setClosing(true);
    if (onClose) {
      onClose(validate);
    }
  };

  const animStyle = useAnimatedStyle(() => {
    const interpolatedTop = interpolate(animState.value, [0, 1], [centerY.value, 0.25 * height + margin], { extrapolateRight: Extrapolation.CLAMP });
    const interpolatedBottom = interpolate(animState.value, [0, 1], [height - centerY.value, margin + insets.bottom], {
      extrapolateRight: Extrapolation.CLAMP
    });
    const interpolatedLeft = interpolate(animState.value, [0, 1], [centerX.value, margin], { extrapolateRight: Extrapolation.CLAMP });
    const interpolatedRight = interpolate(animState.value, [0, 1], [width - centerX.value, margin], { extrapolateRight: Extrapolation.CLAMP });
    const interpolatedBorderRadius = interpolate(animState.value, [0, 1], [width / 2, AppDimensions.borderRadius], {
      extrapolateRight: Extrapolation.CLAMP
    });

    const isOpeningAnimation = animState.value > 0;

    return {
      left: withTiming(interpolatedLeft, {
        duration,
        easing: isOpeningAnimation ? Easing.ease : Easing.circle
      }),
      right: withTiming(
        interpolatedRight,
        {
          duration,
          easing: isOpeningAnimation ? Easing.ease : Easing.circle
        },
        finished => {
          if (finished) {
            if (closing && onClosed) {
              // Modal is now closed and callback is defined
              runOnJS(onClosed)();
            }
          }
          // otherwise animation was cancelled
        }
      ),
      top: withTiming(interpolatedTop, {
        duration,
        easing: isOpeningAnimation ? Easing.ease : Easing.exp
      }),
      bottom: withTiming(interpolatedBottom, {
        duration,
        easing: isOpeningAnimation ? Easing.ease : Easing.ease
      }),
      borderRadius: withTiming(interpolatedBorderRadius, {
        duration,
        easing: isOpeningAnimation ? Easing.exp : Easing.ease
      })
    };
  });

  const DelayedFadeIn = FadeIn.delay(0.85 * duration).duration(0.35 * duration);
  const FastFadeOut = FadeOut.duration(0.15 * duration);

  const backdropStyle = useAnimatedStyle(() => {
    const interpolatedOpacity = interpolate(animState.value, [0, 1], [0, 0.3], {
      extrapolateRight: Extrapolation.CLAMP
    });

    return {
      opacity: withTiming(interpolatedOpacity, {
        duration,
        easing: Easing.ease
      })
    };
  });

  useEffect(() => {
    if (!closing) {
      setShowContent(true);
      animState.value = 1;
    } else {
      setShowContent(false);
      animState.value = 0;
    }
  });

  return (
    <Modal transparent visible onRequestClose={() => closeModal(false)}>
      <Animated.View style={[{ flex: 1, backgroundColor: AppColors.black }, backdropStyle]} />
      <Animated.View style={[{ backgroundColor: color, position: "absolute" }, animStyle]}>
        {showContent && (
          <Animated.View
            style={{
              display: "flex",
              maxHeight: height * 0.75 - margin * 2 - insets.bottom
            }}
            entering={DelayedFadeIn}
            exiting={FastFadeOut}>
            <View style={{ height: "100%" }}>
              {children}
              <Row
                spacing={8}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  position: "absolute",
                  bottom: 0,
                  right: 0
                }}>
                <ModalButton
                  color={AppColors.white}
                  backgroundColor={`rgba(0 0 0 / ${textColor === AppColors.white ? "0.25" : "0.4"})`}
                  text={useOkButton ? "Annuler" : "Fermer"}
                  onPress={() => closeModal(false)}
                />

                {useOkButton && (
                  <ModalButton
                    color={color === AppColors.white ? AppColors.white : AppColors.darkBlue}
                    backgroundColor={color === AppColors.white ? AppColorPalettes.blue[500] : AppColors.white}
                    text="Ok"
                    onPress={() => closeModal(true)}
                  />
                )}
              </Row>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
};

const ModalButton = ({ color, backgroundColor, text, onPress, opacity = 1 }) => (
  <Pressable onPress={onPress}>
    <View
      style={{
        backgroundColor,
        opacity,
        minWidth: 60,
        paddingHorizontal: 12,
        borderRadius: 24
      }}>
      <AppText
        style={{
          fontWeight: "600",
          fontSize: 14,
          color,
          textAlign: "center",
          paddingVertical: 12
        }}>
        {text}
      </AppText>
    </View>
  </Pressable>
);

export function CardButton({
  color = AppColorPalettes.orange[500],
  textColor,
  label,
  value,
  onCancel,
  extendedView,
  useOkButton = false,
  showPopup = false,
  onCloseExtendedView
}: LianeCardProps) {
  let finalTextColor = textColor;
  if (!textColor) {
    finalTextColor = defaultTextColor(color);
  }

  if (showPopup) {
    // Open popup automatically
    this.ref.measureInWindow((x, y) => {
      setModalSpecs({ x, y });
    });
  }
  const [modalSpecs, setModalSpecs] = useState({ x: 0, y: 0 });

  const onTapped = ({ nativeEvent }: GestureResponderEvent) => {
    const { pageX, pageY } = nativeEvent;
    setModalSpecs({ y: pageY, x: pageX });
  };

  return (
    <View
      ref={ref => {
        this.ref = ref;
      }}
      style={styles.baseContainer}>
      {extendedView && modalSpecs.x !== 0 && modalSpecs.y !== 0 && (
        <CardModal
          color={color}
          x={modalSpecs.x}
          y={modalSpecs.y}
          useOkButton={useOkButton}
          onClose={onCloseExtendedView}
          onClosed={() => {
            setModalSpecs({ x: 0, y: 0 });
          }}>
          {extendedView}
        </CardModal>
      )}
      <View onTouchEnd={onTapped}>
        <AppPressable backgroundStyle={[{ backgroundColor: color }, styles.pressableContainer]} style={styles.cardContainer}>
          {label && <AppText style={[{ color: finalTextColor }, styles.label]}>{label}</AppText>}

          <AppText numberOfLines={1} style={[{ color: finalTextColor }, styles.value]}>
            {value}
          </AppText>
        </AppPressable>

        {onCancel && <CancelButton color={color} label={label} onCancel={onCancel} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1
  },
  pressableContainer: {
    borderRadius: AppDimensions.borderRadius
  },
  cardContainer: {
    paddingVertical: AppDimensions.button.paddingVertical,
    paddingHorizontal: AppDimensions.button.paddingHorizontal
  },
  label: {
    fontSize: AppDimensions.textSize.default,
    fontWeight: "400",
    marginBottom: 8
  },
  value: {
    fontSize: AppDimensions.textSize.medium,
    fontWeight: "600"
  },
  cancelPressable: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: "absolute",
    right: -4,
    top: -4
  },

  cancelContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%"
  }
});
