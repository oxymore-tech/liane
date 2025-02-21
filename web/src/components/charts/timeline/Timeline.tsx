"use client";
import { ReactNode, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Tooltip } from "flowbite-react";
import { dispatchCustomEvent, useElementSize, useEvent } from "@/utils/hooks";
import { useLocalization } from "@/api/intl";

/**
 * Timeline component for time-series
 */
export type TimelineData<T> = { data: T; color: string; points: Date[] }[];
export const TimelineChart = <T,>({
  data,
  startDate,
  endDate,
  extendedEndDate,
  idExtractor,
  labelExtractor,
  renderTooltip,
  onHoveredStateChanged,
  onClick
}: {
  data: TimelineData<T>;
  startDate: Date;
  endDate: Date;
  extendedEndDate?: Date;
  idExtractor: (d: T, date: Date) => number;
  labelExtractor: (d: T) => string;
  renderTooltip?: (d: T) => ReactNode;
  onHoveredStateChanged?: (pointId: number, hovered: boolean) => void;
  onClick?: (pointId: number) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const actualEndDate = !!extendedEndDate && extendedEndDate.getTime() > endDate.getTime() ? extendedEndDate : endDate;
  const duration = actualEndDate.getTime() - startDate.getTime();
  const { width, height } = useElementSize(ref, { width: 90, height: 20 }, [data.length, duration]);

  useEvent(HighlightPointEventName, (e: HighlightPointEvent<T>) => {
    const id = "#p" + e.id;
    const point = document.querySelector(id) as SVGCircleElement | null;
    if (!point) return;
    point.setAttribute("stroke-width", e.highlight ? HoveredPointStrokeWidth.toString() : "0");
    point.setAttribute("r", (e.highlight ? HoveredPointRadius : DefaultPointRadius).toString());
  });

  const axisSize = 20;
  const paddingTop = 8;
  const paddingBottom = paddingTop;
  const legendSize = 100;
  const rectPadding = 8;
  const actualWidth = width - legendSize;
  const extendedWidth = actualEndDate
    ? actualWidth * ((actualEndDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()))
    : actualWidth;
  const lineHeight = 36;
  const chartHeight = axisSize + paddingTop + paddingBottom + lineHeight * data.length;

  return (
    <div ref={ref}>
      <div className="absolute">
        <ul
          className="text-left  text-gray-500 dark:text-gray-400 grid"
          style={{ gridTemplateRows: `${paddingTop}px repeat(${data.length}, ${lineHeight}px) 20px`, maxWidth: legendSize }}>
          {data.map((d, i) => (
            <li
              key={i}
              style={{ gridRow: (i + 2).toString(), maxHeight: lineHeight, textOverflow: "ellipsis" }}
              className="flex items-center space-x-1 hover:text-gray-800 dark:hover:text-white leading-none">
              <span className="w-4 h-4 rounded border dark:border-white border-gray-800" style={{ backgroundColor: d.color }} />
              {renderTooltip && (
                <Tooltip placement="right" content={renderTooltip(d.data)}>
                  <span className="cursor-default leading-tight">{labelExtractor(d.data)}</span>
                </Tooltip>
              )}
              {!renderTooltip && <span className="cursor-default">{labelExtractor(d.data)}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div
        style={{
          marginLeft: legendSize,
          height: chartHeight.toString() + "px",
          overflowX: "scroll",
          width: actualWidth + 2 * rectPadding + "px"
        }}>
        <svg width={extendedWidth + 2 * rectPadding} height={height}>
          <g>
            <rect width={extendedWidth + 2 * rectPadding} height={height - axisSize} className="fill-slate-300" />
            <g transform={`translate(${[rectPadding, height - axisSize].join(",")})`}>
              <TimeAxis startDate={startDate} endDate={actualEndDate} width={extendedWidth} />
            </g>
          </g>
          {data.map((el, i) => {
            const y = paddingTop + lineHeight / 2 + lineHeight * i;
            return (
              <g key={i.toString()}>
                <line x1={0} y1={y} x2={extendedWidth + 2 * rectPadding} y2={y} strokeDasharray="4" stroke="black" />
                {el.points.map(p => {
                  const id = idExtractor(el.data, p);
                  return (
                    <TimelinePoint
                      key={id}
                      id={"p" + id}
                      x={rectPadding + ((p.getTime() - startDate.getTime()) / duration) * extendedWidth}
                      y={y}
                      color={el.color}
                      onHoverStateChanged={
                        onHoveredStateChanged
                          ? hovered => {
                              onHoveredStateChanged(id, hovered);
                            }
                          : undefined
                      }
                      onClick={onClick ? () => onClick(id) : undefined}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const HoveredPointRadius = 7;
const DefaultPointRadius = 4;
const HoveredPointStrokeWidth = 4;
const TimelinePoint = ({
  x,
  y,
  color,
  id,
  onHoverStateChanged,
  onClick
}: {
  x: number;
  y: number;
  color: string;
  id?: string;
  onHoverStateChanged?: (hovered: boolean) => void;
  onClick?: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <circle
      id={id}
      cx={x}
      cy={y}
      stroke="#0F172A"
      strokeWidth={hovered ? HoveredPointStrokeWidth : 0}
      r={hovered ? HoveredPointRadius : DefaultPointRadius}
      fill={color}
      style={{
        cursor: hovered ? "pointer" : "default",
        transitionProperty: "all",
        transitionDuration: "150ms",
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
      }}
      onClick={onClick}
      onMouseEnter={() => {
        setHovered(true);
        onHoverStateChanged?.(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHoverStateChanged?.(false);
      }}
    />
  );
};

const TimeAxis = ({ startDate, endDate, width }: { startDate: Date; endDate: Date; width: number }) => {
  const WebLocalization = useLocalization();
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
      value: WebLocalization.formatTime24h(value),
      xOffset: xScale(value)
    }));
  }, [startDate, endDate, width, WebLocalization]);

  return (
    <svg>
      <path d={["M", 0, 6, "v", -6, "H", width, "v", 6].join(" ")} fill="none" stroke="currentColor" />
      <svg className="fill-green-500" xmlns="http://www.w3.org/2000/svg" x="-12" y="3" height="24" viewBox="0 -960 960 960" width="24">
        <path d="M320-200v-560l440 280-440 280Z" />
      </svg>
      {ticks.map(({ value, xOffset }, i) =>
        i > 0 || xOffset > 15 ? (
          <g key={value} transform={`translate(${xOffset}, 0)`}>
            <line y2="6" stroke="currentColor" />(
            <text
              key={value}
              className="fill-gray-500 dark:fill-gray-400 cursor-default"
              style={{
                fontSize: "11px",
                textAnchor: "middle",
                transform: "translateY(20px)"
              }}>
              {value}
            </text>
          </g>
        ) : null
      )}
    </svg>
  );
};

export type HighlightPointEvent<T> = { id: number; highlight: boolean };
const HighlightPointEventName = "highlightTimelinePoint";

export const dispatchHighlightPointEvent = <T,>(event: HighlightPointEvent<T>) => dispatchCustomEvent(HighlightPointEventName, event);
