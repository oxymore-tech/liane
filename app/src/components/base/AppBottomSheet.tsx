import React, { useCallback } from "react";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetProps } from "@gorhom/bottom-sheet";
import { AppColorPalettes } from "@/theme/colors.ts";
import Handle from "@/components/base/Handle.tsx";

export const AppBottomSheetHandleHeight = 60;

type AppBottomSheetProps = Omit<BottomSheetProps, "onChange"> & { onChange?: (position: number) => void; dark?: boolean };

export const AppBottomSheet = ({ onChange, dark = true, ...props }: AppBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const { height } = useAppWindowsDimensions();

  const handleBottomSheetScroll = useCallback(
    (_: number, position: number) => {
      if (!onChange) {
        return;
      }
      onChange(position === 0 ? 0 : height - insets.top - (position + AppBottomSheetHandleHeight));
    },
    [height, insets, onChange]
  );

  return (
    <BottomSheet
      {...props}
      backgroundStyle={{
        backgroundColor: dark ? AppColorPalettes.gray[700] : AppColorPalettes.gray[100]
      }}
      enableDynamicSizing={false}
      handleComponent={Handle}
      onChange={handleBottomSheetScroll}
    />
  );
};
