/* eslint-disable react/require-default-props */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable import/prefer-default-export */
import React from "react";
import { Label } from "./Label";

type Colors = "yellow" | "blue" | "red" | "green";

interface SwitchProps {
  label?: string;
  required?: boolean;
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

export function Switch({ label, required, color = "green", value, onChange }: SwitchProps) {
  const cl = value ? getColor(color) : "bg-gray-300";
  return (
    <>
      {label && <Label className="mr-2" label={label} required={required} />}
      <div
        className={`${cl} outline-none shadow-inner my-2 w-12 h-8 flex items-center rounded-full cursor-pointer p-1 duration-300 ease-in-out`}
        onClick={() => {
          if (onChange) {
            onChange(!value);
          }
        }}
      >
        <div
          className={`bg-white w-6 h-6 rounded-full shadow transform duration-300 ease-in-out ${value && "translate-x-4"}`}
        />
      </div>
    </>
  );
}
