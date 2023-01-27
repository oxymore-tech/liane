import React, { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import Animated, { Easing, FadeIn, FadeOut, SlideOutDown } from "react-native-reanimated";

export interface WizardPageProps extends PropsWithChildren {
  backgroundColor: AppColors;
}

export interface WizardPagerProps {
  dotsColor: AppColors;
  onPageChange: (next: number | null) => void;
  currentPage: number;
  children: (index: number) => JSX.Element;
  pageCount: number;
}

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
};
export const WizardPage = ({ backgroundColor, children }: WizardPageProps) => {
  return (
    <View
      style={{
        flex: 1,
        margin: 8,
        paddingBottom: 32,
        backgroundColor,
        borderRadius: 16
      }}>
      {children}
    </View>
  );
};

const PagerButton = ({ color, text, onPress, opacity = 1 }) => (
  <Pressable onPress={onPress}>
    <AppText
      style={{
        fontWeight: "600",
        fontSize: 14,
        color,
        opacity,
        textAlign: "center"
      }}>
      {text}
    </AppText>
  </Pressable>
);

export const WizardPager = <T extends unknown>({ children, pageCount, dotsColor, onPageChange, currentPage }: WizardPagerProps) => {
  const currentPageChild = children(currentPage);
  const { backgroundColor } = currentPageChild.props as WizardPageProps;
  const grayColor = defaultTextColor(backgroundColor);

  const dots = [...Array(pageCount)].map((_, index) => (
    <View
      key={index}
      style={[
        styles.dot,
        {
          backgroundColor: index === currentPage ? dotsColor : grayColor,
          opacity: index === currentPage ? 1 : 0.5
        }
      ]}
    />
  ));

  // TODO restore {animatePage(currentPageChild, currentPage, pageCount)} when anims fixed
  return (
    <View style={{ flexGrow: 1 }}>
      {currentPageChild}
      <Row style={styles.bottomContainer}>
        <View style={{ flexBasis: 100 }}>
          {currentPage > 0 && <PagerButton color={grayColor} opacity={0.9} text="Précédent" onPress={() => onPageChange(currentPage - 1)} />}
        </View>
        <Row spacing={4} style={{ flexGrow: 1, justifyContent: "center" }}>
          {dots}
        </Row>
        <View style={{ flexBasis: 100 }}>
          {currentPage < pageCount - 1 && <PagerButton color={AppColors.blue700} text="Suivant" onPress={() => onPageChange(currentPage + 1)} />}
          {currentPage === pageCount - 1 && <PagerButton color={AppColors.blue700} text="Terminer" onPress={() => onPageChange(null)} />}
        </View>
      </Row>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomContainer: {
    position: "absolute",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
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
