import { WizardStateSequence, WizardStepsKeys } from "@/screens/lianeWizard/StateMachine";
import { WizardContext, WizardFormData } from "@/screens/lianeWizard/WizardContext";
import { StyleSheet, View } from "react-native";
import { WizardPage, WizardPager } from "@/components/Pager";
import { AppColors } from "@/theme/colors";
import React, { useContext } from "react";
import { useActor } from "@xstate/react";
import { Column } from "@/components/base/AppLayout";

export interface LianePagerProps {
  onNext: () => void;

  onPrev: () => void;

  step: WizardStepsKeys;
}
export const LianePager = ({ onNext, onPrev, step }: LianePagerProps) => {
  const currentPageIndex = WizardStateSequence.indexOf(step);
  const onPageChange = (next: number | null) => {
    if (next === null || next > currentPageIndex) {
      // Go next or leave wizard
      onNext();
    } else {
      // Go prev
      onPrev();
    }
  };

  // TODO fix exiting here as well
  return (
    <WizardPager dotsColor={AppColors.blue700} currentPage={currentPageIndex} pageCount={WizardStateSequence.length} onPageChange={onPageChange}>
      {pageIndex => {
        const key = WizardStateSequence[pageIndex];
        const stepData = WizardFormData[key];
        return (
          <WizardPage key={key} backgroundColor={stepData.mainColor}>
            <Column style={styles.pagerContentContainer} spacing={16}>
              {stepData.forms.map((Form, index) => (
                <Form key={`${key}.field${index}`} />
              ))}
            </Column>
          </WizardPage>
        );
      }}
    </WizardPager>
  );
};

const styles = StyleSheet.create({
  pagerContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between"
  }
});
