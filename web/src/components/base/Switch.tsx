import React from "react";
import { Label } from "./Label";

type Colors = "yellow" | "blue" | "red" | "green";

interface SwitchProps {
  label?: string;
  mandatory?: boolean;
  color?: Colors;
  value?: boolean;
  onChange?: (value: boolean) => any;
}

function getColor(color: Colors) {
  switch (color) {
    default:
    case "blue":
      return "bg-blue-400";

    case "yellow":
      return "bg-yellow-400";

    case "green":
      return "bg-green-400";

    case "red":
      return "bg-red-400";
  }
}

export function Switch({label, mandatory, color = "green", value, onChange}: SwitchProps) {
  const cl = getColor(color);
  return <>
    <div
      className={`outline-none shadow-inner my-2 mr-2 w-12 h-8 flex items-center bg-gray-300 rounded-full cursor-pointer p-1 duration-300 ease-in-out ${value && cl}`}
      onClick={() => {
        if (onChange) {
          onChange(!value);
        }
      }
      }>
      <div
        className={`bg-white w-6 h-6 rounded-full shadow transform duration-300 ease-in-out ${value && 'translate-x-4'}`}/>
    </div>
    {label && <Label label={label} mandatory={mandatory}/>}
  </>;
}
