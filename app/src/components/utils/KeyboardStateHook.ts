import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

/**
 * Hook watching keyboard visibility
 */
export const useKeyboardState = () => {
  const [keyboardIsOpen, setKeyboardIsOpen] = useState(false);
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardIsOpen(true);
    });
    const keyboardHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardIsOpen(false);
    });
    return () => {
      keyboardHideListener.remove();
      keyboardShowListener.remove();
    };
  });
  return keyboardIsOpen;
};
