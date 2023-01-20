import React, { ReactNode } from "react";
import { View } from "react-native";

export type LinearLayoutProps = {
  spacing?: number;

  children: ReactNode;

  style? : any;
};
export const Row = ({ spacing = 0, children, style }: LinearLayoutProps) => (
  <LinearLayout direction="row" spacing={spacing} style={style}>
    {children}
  </LinearLayout>
);

export const Column = ({ spacing = 0, children, style }: LinearLayoutProps) => (
  <LinearLayout direction="column" spacing={spacing} style={style}>
    {children}
  </LinearLayout>
);

type _LinearLayoutProps = {
  spacing?: number;

  children: ReactNode;

  direction: "row" | "column";

  style?: any;
};
const LinearLayout = ({ spacing = 0, children, direction = "row", style }: _LinearLayoutProps) => {

  let lineChildren;

  // Insert spaces between items if necessary
  if (spacing > 0) {
    const spacingStyle = (direction === "row") ? { width: spacing } : { height: spacing };
    const items = React.Children.toArray(children);
    lineChildren = Array(2 * items.length - 1);
    // Set even indexes as actual children and odd indexes as spaces
    for (let i = 0; i < lineChildren.length; i++) {
      lineChildren[i] = (i % 2 === 0) ? (
        items[i / 2]
      ) : (<View key={i} style={spacingStyle} />);
    }
  } else {
    lineChildren = children;
  }

  return (
    <View style={[style, { flexDirection: direction }]}>{lineChildren}</View>
  );
};
