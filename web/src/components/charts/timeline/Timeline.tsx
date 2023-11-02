"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { User } from "@liane/common";

const TimeAxis = ({ startDate, endDate, width }: { startDate: Date; endDate: Date; width: number }) => {
  const ticks = useMemo(() => {
    const minutes = [5, 10, 15, 30, 60];
    let index = 0;
    let tickCount, pixelsPerTick;
    do {
      tickCount = (endDate.getTime() - startDate.getTime()) / (5 * 60 * 1000);
      pixelsPerTick = width / tickCount;
      index++;
    } while (pixelsPerTick < 50 && index < minutes.length);
    const xScale = d3.scaleTime([startDate, endDate], [0, width]);

    return xScale.ticks(tickCount).map(value => ({
      value: value.toLocaleTimeString(),
      xOffset: xScale(value)
    }));
  }, [startDate, endDate, width]);

  return (
    <svg>
      <path d={["M", 0, 6, "v", -6, "H", width, "v", 6].join(" ")} fill="none" stroke="currentColor" />
      {ticks.map(({ value, xOffset }) => (
        <g key={value} transform={`translate(${xOffset}, 0)`}>
          <line y2="6" stroke="currentColor" />
          <text
            key={value}
            className="fill-gray-500 dark:fill-gray-400"
            style={{
              fontSize: "11px",
              textAnchor: "middle",
              transform: "translateY(20px)"
            }}>
            {value}
          </text>
        </g>
      ))}
    </svg>
  );
};

export type TimelineData = { user: User; color: string; points: Date[] }[];
export const TimelineChart = ({ data, startDate, endDate }: { data: TimelineData; startDate: Date; endDate: Date }) => {
  const ref = useRef<HTMLDivElement>();

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(20);
  const duration = endDate.getTime() - startDate.getTime();

  useLayoutEffect(() => {
    if (!ref.current) return;
    setWidth(ref.current.clientWidth);
    setHeight(ref.current.clientHeight);
  }, [data.length, duration]);
  //style={{ height: "200px" }}
  // https://2019.wattenberger.com/blog/react-and-d3
  const axisSize = 20;
  const paddingTop = 8;
  const paddingBottom = paddingTop;
  const legendSize = 90;
  const actualWidth = width - legendSize;
  const lineHeight = 36;

  return (
    <div ref={ref}>
      <div className="absolute">
        <ul
          className="text-left text-gray-500 dark:text-gray-400 grid"
          style={{ gridTemplateRows: `${paddingTop}px repeat(${data.length}, ${lineHeight}px) 20px` }}>
          {data.map((d, i) => (
            <li key={d.user.id!} style={{ gridRow: (i + 2).toString() }} className="flex items-center space-x-1">
              <span className="w-4 h-4 rounded border dark:border-white border-gray-800" style={{ backgroundColor: d.color }} />
              <span>{d.user.pseudo}</span>
            </li>
          ))}
        </ul>
      </div>
      <svg
        width={actualWidth}
        height={height}
        style={{ marginLeft: legendSize, height: (axisSize + paddingTop + paddingBottom + lineHeight * data.length).toString() + "px" }}>
        <g>
          <rect width={actualWidth} height={height - axisSize} className="fill-slate-300" />
          <g transform={`translate(${[0, height - axisSize].join(",")})`}>
            <TimeAxis startDate={startDate} endDate={endDate} width={actualWidth} />
          </g>
        </g>
        {data.map((user, i) => {
          const y = paddingTop + lineHeight / 2 + lineHeight * i; //(axisSize + (i + 0.5) * (height - paddingTop - axisSize)) / data.length;
          return (
            <g key={i.toString()}>
              <line x1={0} y1={y} x2={actualWidth} y2={y} strokeDasharray="4" stroke="black" />
              {user.points.map((p, j) => (
                <TimelinePoint key={i + "_" + j} x={((p.getTime() - startDate.getTime()) / duration) * actualWidth} y={y} color={user.color} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const TimelinePoint = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <circle
      cx={x}
      cy={y}
      r={hovered ? 7 : 4}
      fill={color}
      style={{
        cursor: hovered ? "pointer" : "default",
        transitionProperty: "all",
        transitionDuration: "150ms",
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  );
};
