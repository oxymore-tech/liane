import React from "react";

interface PopupMenuItemProps {
  text:string;
  selected?:boolean;
  img?:string;
  onSelect:() => void;
}

export const PopupMenuItem = ({ text, selected, img, onSelect }:PopupMenuItemProps) => (
  <button type="button" className="text-gray-900 hover:text-yellow-900 p-2 hover:bg-yellow-100 cursor-pointer select-none" onClick={onSelect}>
    <div className="flex items-center justify-left">
      <img className="h-6 mr-2" alt="" src={img} />
      <span className={`${selected ? "font-bold" : "font-normal"} text-gray-700`}>
        {text}
      </span>
    </div>
  </button>
);