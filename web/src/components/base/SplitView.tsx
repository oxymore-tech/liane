import * as React from "react";
import { useResizable } from "react-resizable-layout";
import { Children, PropsWithChildren, useRef } from "react";
import { useElementSize } from "@/utils/hooks";

type SplitViewProps = {
  initial: number;
} & PropsWithChildren &
  React.HTMLProps<HTMLDivElement>;

export function SplitView({ children, initial, ...props }: SplitViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { height: h } = useElementSize(ref);
  const height = h || initial;
  const { position, separatorProps, setPosition, isDragging } = useResizable({
    axis: "y",
    initial: initial,
    min: height / 5,
    max: (3 * height) / 4
  });

  const c = Children.toArray(children);
  return (
    <div {...props} ref={ref} className="h-full grid" style={{ gridTemplateRows: "repeat(" + (c.length > 1 ? "3" : "1") + "auto)" }}>
      <div style={{ height: c.length > 1 ? position : "100%" }} className="top-block w-full relative">
        {c[0]}
        <div className="cursor-default h-2" style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none" }}></div>
      </div>
      {c.length > 1 && (
        <div style={{ boxShadow: "rgba(0, 0, 0, 0.5) 2px -2px 12px 4px", zIndex: 2 }} className={` h-4  cursor-row-resize `} {...separatorProps} />
      )}
      {c.length > 1 && (
        <div style={{ height: height - position - 8, zIndex: 3 }} className="grow flex transition ease-in-out">
          {c[1]}
        </div>
      )}
    </div>
  );
}
