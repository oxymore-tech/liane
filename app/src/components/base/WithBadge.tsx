import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";

export interface BadgeProps {
  value: string | number | null | undefined;

  // color: ColorValue;
}
export const WithBadge =
  WrappedComponent =>
  ({ value, ...props }: BadgeProps & any) => {
    return (
      <View>
        <WrappedComponent {...props} />
        {value !== null && value !== 0 && value !== undefined && (
          <View style={styles.badge}>
            <AppText style={styles.badgeValue}>{value.toString()}</AppText>
          </View>
        )}
      </View>
    );
  };

const styles = StyleSheet.create({
  badge: {
    backgroundColor: AppColors.orange,
    borderRadius: 16,
    paddingHorizontal: 4,
    position: "absolute",
    right: -6,
    top: -6,
    height: 16,
    minWidth: 16
  },
  badgeValue: {
    color: AppColors.white,
    textAlign: "center",
    fontSize: 10
  }
});
