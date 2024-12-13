import { Detached } from "@liane/common";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColors } from "@/theme/colors.ts";
import React from "react";

export type DetachedLianeItemProps = {
  state: Detached;
};

export const DetachedLianeItem = ({ state }: DetachedLianeItemProps) => {
  if (state.matches.length === 0) {
    return <AppText style={{ fontSize: 14, fontWeight: "bold", lineHeight: 23, color: AppColors.darkGray }}> </AppText>;
  }

  return (
    <AppText
      style={{
        fontSize: 14,
        fontWeight: "bold",
        lineHeight: 23,
        color: AppColors.darkGray,
        marginLeft: 5
      }}>
      {state.matches.length === 1 ? "1 proposition" : `${state.matches.length} propositions`}
    </AppText>
  );
};
