import React, { PropsWithChildren } from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useKeyboardState } from "@/components/utils/KeyboardStateHook";
import { useNavigation } from "@react-navigation/native";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";

export interface WizardPageProps extends PropsWithChildren {
  backgroundColor: AppColors;
}

export interface WizardPagerProps {
  color: AppColors;
  onPageChange: (next: number | null) => void;
  currentPage: number;
  children: (index: number) => JSX.Element;
  pageCount: number;
  previousPageOnGoBack?: boolean;
}

/* TODO restore anims
const animatePage = (component, currentPage, pageCount) => {
  return (
    <Animated.View
      key={currentPage}
      style={{
        flex: 1
      }}
      entering={currentPage === 0 ? undefined : FadeIn.easing(Easing.ease)}
      exiting={currentPage === pageCount - 1 ? SlideOutDown : FadeOut.easing(Easing.ease)}>
      {component}
    </Animated.View>
  );
};*/
export const WizardPage = ({ backgroundColor, children }: WizardPageProps) => {
  const keyboardIsVisible = useKeyboardState();
  return (
    <View
      style={{
        flex: 1,
        margin: 8,
        marginBottom: keyboardIsVisible ? 8 : 72, // 52 + 24
        backgroundColor,
        borderRadius: 16
      }}>
      {children}
    </View>
  );
};

export const WizardPager = ({ children, pageCount, color, onPageChange, currentPage, previousPageOnGoBack = true }: WizardPagerProps) => {
  const currentPageChild = children(currentPage);
  const { backgroundColor } = currentPageChild.props as WizardPageProps;
  const grayColor = defaultTextColor(backgroundColor);
  const keyboardIsVisible = useKeyboardState();
  const navigation = useNavigation();

  React.useEffect(() => {
    const onGoBackListener = () => {
      if (!previousPageOnGoBack || currentPage === 0) {
        // Ignore this
        return;
      }
      // Navigate back
      onPageChange(currentPage - 1);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onGoBackListener);
    return () => sub.remove();
  });

  const dots = [...Array(pageCount)].map((_, index) => (
    <View
      key={index}
      style={[
        styles.dot,
        {
          backgroundColor: index === currentPage ? color : AppColors.white,
          opacity: index === currentPage ? 1 : 0.5
        }
      ]}
    />
  ));

  // TODO restore {animatePage(currentPageChild, currentPage, pageCount)} when anims fixed
  return (
    <View style={{ flexGrow: 1 }}>
      {currentPageChild}
      {!keyboardIsVisible && (
        <Row style={styles.bottomContainer}>
          <View style={{ flexBasis: 100 }}>
            {currentPage > 0 && (
              <AppRoundedButton
                backgroundColor={AppColors.white}
                color={AppColorPalettes.gray[800]}
                opacity={0.75}
                text="Précédent"
                onPress={() => onPageChange(currentPage - 1)}
              />
            )}
          </View>
          <Row spacing={4} style={{ flexGrow: 1, justifyContent: "center" }}>
            {dots}
          </Row>
          <View style={{ flexBasis: 100 }}>
            {currentPage < pageCount - 1 && (
              <AppRoundedButton color={grayColor} backgroundColor={color} text="Suivant" onPress={() => onPageChange(currentPage + 1)} />
            )}
            {currentPage === pageCount - 1 && (
              <AppRoundedButton color={grayColor} backgroundColor={color} text="Terminer" onPress={() => onPageChange(null)} />
            )}
          </View>
        </Row>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomContainer: {
    position: "absolute",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
    left: 0,
    right: 0,
    height: 52,
    zIndex: 2,
    bottom: 0
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 8
  }
});
