import { assign, createMachine, Interpreter, raise, StateMachine, StateNodeConfig, TransitionsConfig } from "xstate";
import { LianeDisplay, LianeMatch, LianeMatchDisplay, LianeSearchFilter, RallyingPoint, TargetTimeDirection } from "@/api";

import React from "react";
import { Trip } from "@/api/service/location";
import { BoundingBox } from "@/api/geo";

type Schema = {
  states: {
    [name in HomeMapMachineStateKeys]: {};
  };
};

export type HomeMapMachineStateKeys = "map" | "form" | "point" | "match" | "detail";

export const getSearchFilter = (filter: Partial<InternalLianeMatchFilter>) => {
  return <LianeSearchFilter>{
    availableSeats: -1, //TODO
    to: filter.to!.id!,
    from: filter.from!.id!,
    targetTime: {
      direction: filter.targetTime?.direction ?? "Departure",
      dateTime: (filter.targetTime?.dateTime ?? new Date()).toISOString()
    }
  };
};

export const filterHasFullTrip = (filter: Partial<InternalLianeMatchFilter>): boolean => !(!filter.to || !filter.from);

type InternalLianeMatchFilter = {
  to: RallyingPoint;
  from: RallyingPoint;
  targetTime: {
    dateTime: Date;
    direction: TargetTimeDirection;
  };
  availableSeats: number;
  displayBounds: BoundingBox | undefined;
};

type ReloadCause = "display" | "retry" | undefined;
export type HomeMapContext = {
  filter: Partial<InternalLianeMatchFilter>;
  matches: LianeMatch[];
  selectedMatch: LianeMatch | undefined;
  lianeDisplay: LianeDisplay | undefined;
  error?: any | undefined;
  reloadCause?: ReloadCause;
};

type UpdateDisplayEvent = { type: "DISPLAY"; data: BoundingBox };
type UpdateFilterEvent = { type: "FILTER"; data: Partial<InternalLianeMatchFilter> };
type UpdateEvent = { type: "UPDATE"; data: Partial<Trip> };

type SelectEvent = { type: "SELECT"; data: RallyingPoint }; //TODO go to
type MatchEvent = { type: "DETAIL"; data: LianeMatch }; //TODO go to
type ReloadEvent = { type: "RELOAD"; data: ReloadCause };

type Event =
  | UpdateFilterEvent
  | UpdateEvent
  | UpdateDisplayEvent
  | { type: "FORM" } // TODO go to
  | { type: "BACK" }
  | ReloadEvent
  | SelectEvent
  | MatchEvent;
// | UpdateFilterEvent
// | UpdateDisplayEvent;

export type HomeStateMachine = StateMachine<HomeMapContext, Schema, Event>;

export type HomeStateMachineInterpreter = Interpreter<HomeMapContext, Schema, Event>;

const createState = <T>(
  //  id: string,
  idleState: { on: TransitionsConfig<HomeMapContext, Event> | undefined },
  //  onBack?: TransitionConfigOrTarget<HomeMapContext, Event>,
  load?: {
    src: (context: HomeMapContext, event: Event) => Promise<T>;
    assign: (context: HomeMapContext, event: { type: "done.invoke"; data: T }) => HomeMapContext;
    autoLoadCond?: (context: HomeMapContext, event: Event) => boolean;
  }
) => {
  let state: StateNodeConfig<HomeMapContext, any, Event> = {
    initial: "init",
    on: {
      RELOAD: {
        target: ".init",
        actions: ["setReloadCause"]
      },
      ...idleState.on
    },
    states: {
      init: { always: [...(load ? [{ target: "load", cond: load.autoLoadCond }] : []), { target: "idle" }] },
      load: {},
      failed: {},
      idle: {}
    }
  };
  /*if (onBack) {
    state.on!.BACK = onBack;
  }*/
  if (load) {
    //state.on!.RELOAD.actions = forwardTo("map.loader" + ff);
    state.states!.load.invoke = {
      src: load.src,

      onDone: {
        target: "idle",
        actions: [() => console.log("loaded"), assign(load.assign)]
      },
      onError: {
        target: "failed",
        actions: assign({ error: (context, event) => event.data })
      }
    };
  }
  return state;
};
export const HomeMapMachine = (services: {
  match: (ctx: HomeMapContext) => Promise<LianeMatchDisplay>;
  display: (ctx: HomeMapContext) => Promise<LianeDisplay | undefined>;
  cacheRecentTrip: (trip: Trip) => void;
}): HomeStateMachine =>
  createMachine(
    {
      id: "homeMap",
      predictableActionArguments: true,
      context: <HomeMapContext>{
        filter: { from: undefined, to: undefined },
        matches: [],
        lianeDisplay: undefined,
        selectedMatch: undefined,
        displayBounds: undefined
      },
      initial: "map",
      states: {
        map: createState(
          {
            on: {
              DISPLAY: {
                actions: ["updateBounds", raise({ type: "RELOAD", data: "display" })]
              },
              UPDATE: {
                actions: ["updateTrip"]
              },
              FILTER: {
                actions: ["updateFilter", raise("RELOAD")]
              },
              FORM: {
                target: "#homeMap.form",
                actions: ["resetMatches"]
              },
              SELECT: {
                target: "#homeMap.point",
                actions: ["selectRallyingPoint"]
              },
              DETAIL: {
                target: "#homeMap.detail",
                actions: ["selectMatch"]
              }
            }
          },

          {
            src: (context, _) => services.display(context),
            assign: (context, event) => ({
              ...context,
              matches: (event.data?.lianes ?? []).map(liane => ({
                liane,
                match: {
                  type: "Exact",
                  pickup: liane.wayPoints[0].rallyingPoint.id!,
                  deposit: liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint.id!
                },
                freeSeatsCount: liane.members.map(l => l.seatCount).reduce((acc, c) => acc + c, 0)
              })),
              lianeDisplay: event.data || context.lianeDisplay // Keep previous display if undefined
            })
          }
        ),
        form: createState({
          on: {
            BACK: {
              target: "#homeMap.map",
              actions: ["resetTrip"]
            },
            UPDATE: [
              {
                actions: [
                  "updateTrip",
                  (context, event) =>
                    services.cacheRecentTrip({ from: (event.data.from || context.filter.from)!, to: (event.data.to || context.filter.to)! }),
                  "resetMatches"
                ],
                target: "#homeMap.match",

                cond: (context, event: UpdateEvent) => {
                  return filterHasFullTrip({ from: event.data.from || context.filter.from, to: event.data.to || context.filter.to });
                }
              },
              { actions: ["updateTrip"] }
            ]
          }
        }),
        point: createState({
          on: {
            FILTER: {
              actions: ["updateFilter"] // raise("RELOAD")] // TODO
            },
            BACK: { target: "#homeMap.map", actions: ["resetTrip"] },
            UPDATE: [
              {
                actions: ["resetTrip", "updateTrip"],
                target: "#homeMap.match",
                cond: (context, event: UpdateEvent) => {
                  return filterHasFullTrip(event.data);
                }
              },
              {
                actions: ["resetTrip", "updateTrip"],
                target: "#homeMap.form"
              }
            ],
            SELECT: {
              target: "#homeMap.point",
              actions: ["selectRallyingPoint"]
            }
          }
        }),
        match: createState(
          {
            on: {
              FILTER: {
                actions: ["updateFilter", raise("RELOAD")]
              },

              DETAIL: {
                target: "#homeMap.detail",
                actions: ["selectMatch"]
              },
              BACK: { target: "#homeMap.map", actions: ["resetTrip", "resetMatches"] },
              UPDATE: {
                actions: ["updateTrip"],
                target: "#homeMap.form"
              }
            }
          },

          {
            src: (context, _) => services.match(context),
            autoLoadCond: (context, _) => !context.matches,
            assign: (context, event) => ({
              ...context,
              matches: event.data.lianeMatches,
              lianeDisplay: { segments: event.data.segments, lianes: event.data.lianeMatches.map(lm => lm.liane) }
            })
          }
        ),
        detail: createState({
          on: {
            BACK: [
              {
                target: "#homeMap.match",
                actions: ["resetMatch"],
                cond: (context, _) => {
                  return filterHasFullTrip(context.filter);
                }
              },
              {
                target: "#homeMap.map",
                actions: ["resetMatch"],
                cond: (context, _) => {
                  return !context.filter.to && !context.filter.from;
                }
              }
            ]
          }
        })
      }
    },
    {
      actions: {
        resetTrip: assign({ filter: { from: undefined, to: undefined } }),
        resetMatch: assign<HomeMapContext, MatchEvent>({ selectedMatch: undefined }),
        resetMatches: assign<HomeMapContext, MatchEvent>({ matches: undefined }),
        selectRallyingPoint: assign<HomeMapContext, SelectEvent>({
          filter: (context, event) => {
            return { ...context.filter, from: event.data, to: undefined };
          }
        }),
        selectMatch: assign<HomeMapContext, MatchEvent>({ selectedMatch: (context, event) => event.data }),
        setReloadCause: assign<HomeMapContext, ReloadEvent>({
          reloadCause: (context, event) => event.data
        }),
        updateFilter: assign<HomeMapContext, UpdateFilterEvent>({
          filter: (context, event) => {
            return {
              ...context.filter,
              targetTime: { direction: event.data.targetTime?.direction || "Departure", dateTime: event.data.targetTime?.dateTime || new Date() },
              availableSeats: event.data.availableSeats
            };
          }
        }),
        updateBounds: assign<HomeMapContext, UpdateDisplayEvent>({
          filter: (context, event) => ({ ...context.filter, displayBounds: event.data })
        }),
        updateTrip: assign<HomeMapContext, UpdateEvent>({
          filter: (context, event) => {
            const newTrip = { ...context.filter, ...event.data };
            if (newTrip.from && newTrip.from?.id === newTrip.to?.id) {
              // Ignore if to & from are set to same value
              return context.filter;
            }
            return newTrip;
          }
        })
      }
    }
  );
// @ts-ignore
export const HomeMapContext = React.createContext<HomeStateMachineInterpreter>();
