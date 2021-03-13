import React from 'react';
import { Button, IconNode } from 'react-native-elements';
import { ButtonProps } from "react-native";

export interface LianeButtonProps extends ButtonProps {
  icon?: IconNode;
}

export function AppButton({icon, ...props}: LianeButtonProps) {

  return <Button
    icon={icon}
    titleStyle={{fontFamily: "Inter"}}
    {...props}
  />
}
