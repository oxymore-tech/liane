import {
  assign,
  BaseActionObject,
  BaseActions,
  createMachine,
  Interpreter,
  raise,
  StateMachine,
  StateNodeConfig,
  TransitionConfigOrTarget,
  TransitionsConfig
} from "xstate";
import {
  BoundingBox,
  DayOfWeekFlag,
  EmptyFeatureCollection,
  Liane,
  LianeMatch,
  LianeMatchDisplay,
  LianeSearchFilter,
  RallyingPoint,
  Ref,
  Trip
} from "@liane/common";

import React from "react";
import { FeatureCollection } from "geojson";
import { BehaviorSubject } from "rxjs";

type Schema = {
  states: {
    [name in HomeMapMachineStateKeys]: {};
  };
};

export type HomeMapMachineStateKeys = "map" | "form" | "point" | "match" | "detail";

export const getSearchFilter = (filter: Partial<InternalLianeMatchFilter>) => {
  return <LianeSearchFilter>{
    availableSeats: -1,
    to: filter.to!.id!,
    from: filter.from!.id!
  };
};

export const filterHasFullTrip = (filter: Partial<InternalLianeMatchFilter>): boolean => !(!filter.to || !filter.from);

type InternalLianeMatchFilter = {
  to: RallyingPoint;
  from: RallyingPoint;
  weekDays?: DayOfWeekFlag;
  availableSeats: number;
};

type ReloadCause = "display" | "refresh";
type MapDisplayParams = {
  displayBounds: BoundingBox | undefined;
  displayAllPoints?: boolean | undefined;
};
export type HomeMapContext = {
  filter: Partial<InternalLianeMatchFilter>;
  matches: LianeMatch[] | undefined;
  selectedMatch: LianeMatch | undefined;
  error?: any | undefined;
  reloadCause?: ReloadCause | undefined;
  mapDisplay: MapDisplayParams;
};

type UpdateDisplayEvent = { type: "DISPLAY"; data: MapDisplayParams };
type UpdateFilterEvent = { type: "FILTER"; data: Partial<InternalLianeMatchFilter> };
type UpdateEvent = { type: "UPDATE"; data: Partial<Trip> };

type SelectEvent = { type: "SELECT"; data: RallyingPoint }; //TODO go to
type MatchEvent = { type: "DETAIL"; data: LianeMatch }; //TODO go to
type ReloadEvent = { type: "RELOAD"; data: ReloadCause };

type FilterDisplayEvent = { type: "DISPLAY"; data: Ref<Liane>[] };

type Event =
  | UpdateFilterEvent
  | UpdateEvent
  | UpdateDisplayEvent
  | { type: "FORM" } // TODO go to
  | { type: "BACK" }
  | ReloadEvent
  | SelectEvent
  | MatchEvent
  | FilterDisplayEvent;

export type HomeStateMachine = StateMachine<HomeMapContext, Schema, Event>;

export type HomeStateMachineInterpreter = Interpreter<HomeMapContext, Schema, Event>;

const createState = <T>(
  //  id: string,
  idleState: { on: TransitionsConfig<HomeMapContext, Event> | undefined; always?: TransitionConfigOrTarget<HomeMapContext, Event> },
  //  onBack?: TransitionConfigOrTarget<HomeMapContext, Event>,
  load?: {
    src: (context: HomeMapContext, event: Event) => Promise<T>;
    actions: BaseActions<HomeMapContext, { type: "done.invoke"; data: T }, Event, BaseActionObject>[];
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
    // @ts-ignore
    state.states!.load.invoke = {
      src: load.src,

      onDone: {
        target: "idle",
        actions: ["resetReloadCause", ...load.actions]
      },
      onError: {
        target: "failed",
        actions: assign({ error: (context, e: any) => e.data })
      }
    };
  }
  return state;
};
export const HomeMapMachine = (services: {
  services: {
    match: (ctx: HomeMapContext) => Promise<LianeMatchDisplay>;
    //display: (ctx: HomeMapContext) => Promise<FeatureCollection | undefined>;
    cacheRecentTrip: (trip: Trip) => void;
    cacheRecentPoint: (rp: RallyingPoint) => void;
  };
  observables: {
    displaySubject: BehaviorSubject<[FeatureCollection, Set<Ref<Liane>> | undefined]>;
  };
}): HomeStateMachine =>
  createMachine(
    {
      id: "homeMap",
      predictableActionArguments: true,
      context: <HomeMapContext>{
        filter: { from: undefined, to: undefined, targetTime: { dateTime: new Date(), direction: "Departure" }, availableSeats: -1 },
        matches: undefined,
        matchesDisplay: EmptyFeatureCollection,
        selectedMatch: undefined,
        mapDisplay: { displayBounds: undefined }
      },
      initial: "map",
      states: {
        map: createState(
          {
            on: {
              DISPLAY: {
                actions: ["updateBounds"]
                //actions: ["updateBounds", raise({ type: "RELOAD", data: "display" })]
              },
              UPDATE: [
                {
                  actions: ["resetTrip", "updateTrip", "resetMatches"],
                  target: "#homeMap.match",
                  cond: (context, event: UpdateEvent) => {
                    return filterHasFullTrip(event.data);
                  }
                },
                {
                  actions: ["updateTrip"]
                }
              ],
              FILTER: {
                actions: ["updateFilter", raise("RELOAD")]
              },
              FORM: {
                target: "#homeMap.form",
                actions: ["resetMatches"]
              },
              SELECT: {
                target: "#homeMap.point",
                actions: ["selectToRallyingPoint", "cacheRecentPoint"]
              },
              DETAIL: {
                target: "#homeMap.detail",
                actions: ["selectMatch"]
              }
            }
          }
          /*{
            src: (context, _) => services.services.display(context),
            autoLoadCond: () => true,
            actions: [
              (context, event) => {
                services.observables.displaySubject.next(event.data || EmptyFeatureCollection);
              }
            ]
          }*/
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
                actions: ["updateTrip", "cacheRecentTrip", "resetMatches"],
                target: "#homeMap.match",

                cond: (context, event: UpdateEvent) => {
                  const newFrom = Object.hasOwn(event.data, "from") ? event.data.from : context.filter.from;
                  const newTo = Object.hasOwn(event.data, "to") ? event.data.to : context.filter.to;

                  return filterHasFullTrip({ from: newFrom, to: newTo });
                }
              },
              { actions: ["updateTrip"] }
            ]
          }
        }),
        point: createState({
          on: {
            DISPLAY: {
              actions: ["updateBounds"]
            },
            FILTER: {
              actions: ["updateFilter"] // raise("RELOAD")] // TODO
            },
            BACK: { target: "#homeMap.map", actions: ["resetTrip"] },
            UPDATE: [
              {
                actions: ["resetTrip", "updateTrip", "cacheRecentTrip", "resetMatches"],
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
              },
              { actions: ["updateTrip"] }
            ],
            SELECT: [
              {
                cond: (context, event: SelectEvent) => {
                  return !context.filter.to && !!context.filter.from && context.filter.from.id !== event.data!.id;
                },
                target: "#homeMap.match",
                actions: ["cacheRecentPoint", "selectToRallyingPoint", "cacheRecentTrip"]
              },
              {
                cond: (context, event: SelectEvent) => {
                  return !context.filter.from && !!context.filter.to && context.filter.to.id !== event.data!.id;
                },
                target: "#homeMap.match",
                actions: ["cacheRecentPoint", "selectFromRallyingPoint", "cacheRecentTrip"]
              }
            ] /*{ target: "#homeMap.point", actions: ["selectRallyingPoint"] }*/
          }
        }),
        match: createState(
          {
            on: {
              FILTER: {
                actions: ["updateFilter", "resetMatches", "resetMatchesDisplay", raise({ type: "RELOAD", data: "refresh" })]
              },

              DETAIL: {
                target: "#homeMap.detail",
                actions: ["selectMatch"]
              },
              BACK: {
                target: "#homeMap.point", //map
                actions: [
                  assign({ filter: context => ({ ...context.filter, to: undefined }) }) /*"resetTrip"*/,

                  "resetMatches",
                  "resetMatchesDisplay"
                ]
              },
              UPDATE: [
                {
                  actions: ["resetTrip", "updateTrip", "cacheRecentTrip", "resetMatches", "resetMatchesDisplay"],
                  target: "#homeMap.match",
                  cond: (context, event: UpdateEvent) => {
                    return filterHasFullTrip(event.data);
                  }
                },
                {
                  actions: ["updateTrip", "resetMatches", "resetMatchesDisplay"],
                  target: "#homeMap.point" //  target: "#homeMap.form"
                }
              ],
              DISPLAY: {
                actions: [
                  (context, event: FilterDisplayEvent) => {
                    const matchesDisplay = services.observables.displaySubject.getValue();

                    services.observables.displaySubject.next([matchesDisplay[0], new Set(event.data)]);
                  }
                ]
              }
            }
          },

          {
            src: (context, _) => {
              return services.services.match(context);
            },
            autoLoadCond: (context, _) => {
              return !context.matches || !!context.reloadCause;
            },
            actions: [
              //   () => services.observables.displaySubject.next([EmptyFeatureCollection, new Set()]),
              assign((context, event) => {
                return {
                  ...context,
                  matches: event.data.lianeMatches,
                  matchesDisplay: event.data.features
                };
              }),
              (context, event) => {
                services.observables.displaySubject.next([event.data.features, undefined]);
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
        cacheRecentTrip: (context, event: UpdateEvent) =>
          services.services.cacheRecentTrip({
            from: (event.data.from || context.filter.from)!,
            to: (event.data.to || context.filter.to)!
          }),
        cacheRecentPoint: (context, event: SelectEvent) => services.services.cacheRecentPoint(event.data),

        resetTrip: assign({ filter: context => ({ ...context.filter, from: undefined, to: undefined }) }),
        resetMatch: assign<HomeMapContext, MatchEvent>({ selectedMatch: undefined }),
        resetMatches: assign<HomeMapContext, MatchEvent>({ matches: undefined }),
        resetMatchesDisplay: () => services.observables.displaySubject.next([EmptyFeatureCollection, new Set()]),

        selectFromRallyingPoint: assign<HomeMapContext, SelectEvent>({
          filter: (context, event) => {
            return { ...context.filter, from: event.data };
          }
        }),
        selectToRallyingPoint: assign<HomeMapContext, SelectEvent>({
          filter: (context, event) => {
            return { ...context.filter, to: event.data };
          }
        }),
        selectMatch: assign<HomeMapContext, MatchEvent>({ selectedMatch: (context, event) => event.data }),
        setReloadCause: assign<HomeMapContext, ReloadEvent>({
          reloadCause: (context, event) => event.data
        }),
        resetReloadCause: assign<HomeMapContext, ReloadEvent>({
          reloadCause: () => undefined
        }),
        updateFilter: assign<HomeMapContext, UpdateFilterEvent>({
          filter: (context, event) => {
            const availableSeats = (Object.hasOwn(event.data, "availableSeats") ? event.data.availableSeats : context.filter.availableSeats) || -1;
            const weekDays = Object.hasOwn(event.data, "weekDays") ? event.data.weekDays : context.filter.weekDays;
            return {
              ...context.filter,
              weekDays,
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
            return newTrip;
          }
        })
      }
    }
  );
// @ts-ignore
export const HomeMapContext = React.createContext<HomeStateMachineInterpreter>();
