import React from "react";
import { View, ViewProps } from "react-native";

export type LinearLayoutProps = {
  spacing?: number;
} & LayoutComponentProps;

export type LayoutComponentProps = {} & ViewProps;

export const Center = ({ style, children, ...props }: LayoutComponentProps) => (
  <View {...props} style={[{ alignItems: "center", justifyContent: "center" }, style]}>
    {children}
  </View>
);

export const Row = ({ spacing = 0, children, style, ...props }: LinearLayoutProps) => (
  <LinearLayout {...props} direction="row" spacing={spacing} style={style}>
    {children}
  </LinearLayout>
);

export const Column = ({ spacing = 0, children, style, ...props }: LinearLayoutProps) => (
  <LinearLayout {...props} direction="column" spacing={spacing} style={style}>
    {children}
  </LinearLayout>
);

type _LinearLayoutProps = {
  spacing?: number;

  direction: "row" | "column";
} & ViewProps;
const LinearLayout = ({ spacing = 0, children, direction = "row", style, ...props }: _LinearLayoutProps) => {
  let lineChildren;

  // Insert spaces between items if necessary
  if (spacing > 0 && children && React.Children.count(children) > 0) {
    const spacingStyle = direction === "row" ? { width: spacing } : { height: spacing };
    const items = React.Children.toArray(children);
    lineChildren = Array(Math.max(2 * items.length - 1, 0));
    // Set even indexes as actual children and odd indexes as spaces
    for (let i = 0; i < lineChildren.length; i++) {
      lineChildren[i] = i % 2 === 0 ? items[i / 2] : <View key={i} style={spacingStyle} />;
    }
  } else {
    lineChildren = children;
  }

  return (
    <View {...props} style={[style, { flexDirection: direction }]}>
      {lineChildren}
    </View>
  );
};
