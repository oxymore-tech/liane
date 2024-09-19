import React from "react";
import { KeyboardAvoidingView, View, ViewProps } from "react-native";

export type LinearLayoutProps = {
  spacing?: number;
  gap?: number;
  avoidKeyboard?: boolean;
} & ViewProps;

export const Space = () => <View style={{ flex: 1 }} />;

export const Center = ({ style, children, avoidKeyboard, ...props }: LinearLayoutProps) => {
  const Container = getContainerType(avoidKeyboard);
  return (
    <Container {...props} style={[{ display: "flex", alignItems: "center", justifyContent: "center" }, style]}>
      {children}
    </Container>
  );
};

export const Row = ({ spacing = 0, children, style, avoidKeyboard, ...props }: LinearLayoutProps) => {
  const Container = getContainerType(avoidKeyboard);
  return (
    <Container {...props} style={[style, { display: "flex", flexDirection: "row", gap: spacing }]}>
      {children}
    </Container>
  );
};

export const Column = ({ spacing = 0, children, style, avoidKeyboard, ...props }: LinearLayoutProps) => {
  const Container = getContainerType(avoidKeyboard);
  return (
    <Container {...props} style={[style, { display: "flex", flexDirection: "column", gap: spacing }]}>
      {children}
    </Container>
  );
};

function getContainerType(avoidKeyboard?: boolean) {
  return avoidKeyboard ? KeyboardAvoidingView : View;
}
