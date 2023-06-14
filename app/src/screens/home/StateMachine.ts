import {
  assign,
  AssignAction,
  createMachine,
  Interpreter,
  raise,
  StateMachine,
  StateNodeConfig,
  TransitionConfigOrTarget,
  TransitionsConfig
} from "xstate";
import { LianeMatch, LianeMatchDisplay, LianeSearchFilter, RallyingPoint, TargetTimeDirection } from "@/api";

import React from "react";
import { Trip } from "@/api/service/location";
import { BoundingBox } from "@/api/geo";
import { FeatureCollection } from "geojson";
import { BehaviorSubject } from "rxjs";
import { EmptyFeatureCollection } from "@/util/geometry";

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
};

type ReloadCause = "display" | "retry" | undefined;
type MapDisplayParams = {
  displayBounds: BoundingBox | undefined;
  displayAllPoints?: boolean | undefined;
};
export type HomeMapContext = {
  filter: Partial<InternalLianeMatchFilter>;
  matches: LianeMatch[] | undefined;
  selectedMatch: LianeMatch | undefined;
  // lianeDisplay: LianeDisplay | undefined;
  error?: any | undefined;
  reloadCause?: ReloadCause;
  mapDisplay: MapDisplayParams;
};

type UpdateDisplayEvent = { type: "DISPLAY"; data: MapDisplayParams };
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

export type HomeStateMachine = StateMachine<HomeMapContext, Schema, Event>;

export type HomeStateMachineInterpreter = Interpreter<HomeMapContext, Schema, Event>;

const createState = <T>(
  //  id: string,
  idleState: { on: TransitionsConfig<HomeMapContext, Event> | undefined; always?: TransitionConfigOrTarget<HomeMapContext, Event> },
  //  onBack?: TransitionConfigOrTarget<HomeMapContext, Event>,
  load?: {
    src: (context: HomeMapContext, event: Event) => Promise<T>;
    actions: ((
      context: HomeMapContext,
      event: { type: "done.invoke"; data: T }
    ) => HomeMapContext | AssignAction<HomeMapContext, { type: "done.invoke"; data: T }>)[];
    autoLoadCond?: (context: HomeMapContext, event: Event) => boolean;
  }
) => {
  const trueCondition = () => true;
  let state: StateNodeConfig<HomeMapContext, any, Event> = {
    initial: "init",
    ...idleState,
    on: {
      RELOAD: {
        target: ".init",
        actions: ["setReloadCause"]
      },
      ...idleState.on
    },
    states: {
      init: { always: [...(load ? [{ target: "load", cond: load.autoLoadCond || trueCondition }] : []), { target: "idle" }] },
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
        actions: [() => console.log("loading done"), ...load.actions]
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
  services: {
    match: (ctx: HomeMapContext) => Promise<LianeMatchDisplay>;
    display: (ctx: HomeMapContext) => Promise<FeatureCollection | undefined>;
    cacheRecentTrip: (trip: Trip) => void;
    cacheRecentPoint: (rp: RallyingPoint) => void;
  };
  observables: {
    displaySubject: BehaviorSubject<FeatureCollection>;
  };
}): HomeStateMachine =>
  createMachine(
    {
      id: "homeMap",
      predictableActionArguments: true,
      context: <HomeMapContext>{
        filter: { from: undefined, to: undefined, targetTime: { dateTime: new Date(), direction: "Departure" }, availableSeats: -1 },
        matches: undefined,
        //    lianeDisplay: undefined,
        selectedMatch: undefined,
        mapDisplay: { displayBounds: undefined }
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
            src: (context, _) => services.services.display(context),
            autoLoadCond: () => true,
            actions: [
              (context, event) => {
                console.log(services.observables.displaySubject);
                services.observables.displaySubject.next(event.data || EmptyFeatureCollection);
              }
            ]
          }
        ),
        form: createState({
          always: {
            cond: (context, _) => {
              return filterHasFullTrip(context.filter);
            },
            target: "#homeMap.match"
          },
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
                    services.services.cacheRecentTrip({ from: (event.data.from || context.filter.from)!, to: (event.data.to || context.filter.to)! }),
                  "resetMatches"
                ],
                target: "#homeMap.match",

                cond: (context, event: UpdateEvent) => {
                  const newFrom = Object.hasOwn(event.data, "from") ? event.data.from : context.filter.from;
                  const newTo = Object.hasOwn(event.data, "to") ? event.data.to : context.filter.to;
                  console.debug(newFrom?.id, newTo?.id);
                  return filterHasFullTrip({ from: newFrom, to: newTo });
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
                actions: ["resetTrip", "updateTrip"], //, (context, event) => services.services.cacheRecentPoint((event.data.from || event.data.to)!)],
                target: "#homeMap.map",
                cond: (context, event: UpdateEvent) => {
                  return !event.data.to && !event.data.from;
                }
              }
            ],
            SELECT: {
              target: "#homeMap.match",
              actions: ["selectRallyingPoint2"]
            } /*{ target: "#homeMap.point", actions: ["selectRallyingPoint"] }*/
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
                target: "#homeMap.point" //  target: "#homeMap.form"
              }
            }
          },

          {
            src: (context, _) => services.services.match(context),
            autoLoadCond: (context, _) => !context.matches,
            actions: [
              assign((context, event) => {
                return {
                  ...context,
                  matches: event.data.lianeMatches
                  //lianeDisplay: { segments: event.data.segments, lianes: event.data.lianeMatches.map(lm => lm.liane) }
                };
              }),
              (context, event) => {
                services.observables.displaySubject.next(event.data.features);
              }
            ]
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
        resetTrip: assign({ filter: context => ({ ...context.filter, from: undefined, to: undefined }) }),
        resetMatch: assign<HomeMapContext, MatchEvent>({ selectedMatch: undefined }),
        resetMatches: assign<HomeMapContext, MatchEvent>({ matches: undefined }),
        selectRallyingPoint: assign<HomeMapContext, SelectEvent>({
          filter: (context, event) => {
            return { ...context.filter, from: event.data, to: undefined };
          }
        }),
        selectRallyingPoint2: assign<HomeMapContext, SelectEvent>({
          filter: (context, event) => {
            return { ...context.filter, to: event.data };
          }
        }),
        selectMatch: assign<HomeMapContext, MatchEvent>({ selectedMatch: (context, event) => event.data }),
        setReloadCause: assign<HomeMapContext, ReloadEvent>({
          reloadCause: (context, event) => event.data
        }),
        updateFilter: assign<HomeMapContext, UpdateFilterEvent>({
          filter: (context, event) => {
            const availableSeats = (Object.hasOwn(event.data, "availableSeats") ? event.data.availableSeats : context.filter.availableSeats) || -1;
            const targetTime = Object.hasOwn(event.data, "targetTime") ? event.data.targetTime : context.filter.targetTime;
            return {
              ...context.filter,
              targetTime: { direction: targetTime?.direction || "Departure", dateTime: targetTime?.dateTime || new Date() },
              availableSeats
            };
          }
        }),
        updateBounds: assign<HomeMapContext, UpdateDisplayEvent>({
          mapDisplay: (context, event) => event.data
        }),
        updateTrip: assign<HomeMapContext, UpdateEvent>({
          filter: (context, event) => {
            const newTrip = { ...context.filter, ...event.data };
            if (newTrip.from && newTrip.from?.id === newTrip.to?.id) {
              // Ignore if to & from are set to same value
              return context.filter;
            }
            // console.log(newTrip);
            return newTrip;
          }
        })
      }
    }
  );
// @ts-ignore
export const HomeMapContext = React.createContext<HomeStateMachineInterpreter>();
