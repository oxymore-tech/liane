import React, { ReactNode } from 'react';
import { Text } from 'react-native-elements';
import { TextProps } from "react-native";

export interface AppTextProps extends TextProps {
  children?: ReactNode;
}

export function AppText({style, children, ...props}: AppTextProps) {
  return <Text
    style={{...(style as object), fontFamily: "Inter"}}
    {...props}
  >{children}</Text>
}
