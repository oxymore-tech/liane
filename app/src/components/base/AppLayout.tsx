import React from "react";
import { View, ViewProps } from "react-native";

export type LinearLayoutProps = {
  spacing?: number;
  gap?: number;
} & ViewProps;

export const Space = () => <View style={{ flex: 1 }} />;

export const Center = ({ style, children, ...props }: ViewProps) => (
  <View {...props} style={[{ alignItems: "center", justifyContent: "center" }, style]}>
    {children}
  </View>
);

export const Row = ({ spacing = 0, children, style, ...props }: LinearLayoutProps) => (
  <View {...props} style={[style, { flexDirection: "row", gap: spacing }]}>
    {children}
  </View>
);

export const Column = ({ spacing = 0, children, style, ...props }: LinearLayoutProps) => (
  <View {...props} style={[style, { flexDirection: "column", gap: spacing }]}>
    {children}
  </View>
);
