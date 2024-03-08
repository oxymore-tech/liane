import * as React from "react";
import { PropsWithChildren } from "react";

type ControlPanelProps = {} & PropsWithChildren;
type ControlProps = { label: string } & PropsWithChildren;
export function ControlPanel({ children }: ControlPanelProps) {
  return (
    <div id="top-left-panel" className="maplibregl-ctrl-top-left max-h-72 flex">
      {children}
    </div>
  );
}

export function ControlPanelButton({ children, label, onClick }: ControlProps & { onClick: () => void }) {
  return (
    <div className="maplibregl-ctrl bg-gray-100 rounded-md">
      <button title={label} onClick={onClick} className="border-2 border-gray-300 bg-white p-[6px] rounded-md cursor-pointer hover:bg-gray-100">
        {children}
      </button>
    </div>
  );
}

export function ControlPanelToggle({ children, active, setActive, label }: ControlProps & { active: boolean; setActive: (active: boolean) => void }) {
  const style = active
    ? "border-2 border-blue-400 bg-blue-100 p-[6px] rounded-md cursor-pointer hover:bg-gray-100"
    : "border-2 border-gray-300 bg-white p-[6px] rounded-md cursor-pointer hover:bg-gray-100";

  return (
    <div className="maplibregl-ctrl bg-gray-100 rounded-md">
      <button onClick={() => setActive(!active)} title={label} className={style}>
        {children}
      </button>
    </div>
  );
}
