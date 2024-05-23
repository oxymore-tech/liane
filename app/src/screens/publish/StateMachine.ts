import { assign, createMachine, Interpreter, StateMachine } from "xstate";
import React from "react";
import {
  CoLianeRequest,
  createStateSequence,
  CreateSubmittingState,
  DayOfWeekFlag,
  Liane,
  RallyingPoint,
  ServiceDoneEvent,
  SubmittingEvents
} from "@liane/common";

export const PublishStateSequence = ["trip", "days", "time", "vehicle"] as const;
export const PublishStateCount = PublishStateSequence.length;

export type PublishStepsKeys = (typeof PublishStateSequence)[number];

type StateKeys = PublishStepsKeys | "return" | "name" | "overview" | "submitting";

type Schema = {
  states: {
    [name in StateKeys]: {};
  };
};

export type TimeIntervalConstraint = { leaveAfter: Date | undefined | null; arriveBefore: Date | undefined | null };
export type InternalLianeRequest = {
  to: RallyingPoint;
  from: RallyingPoint;
  recurrence: DayOfWeekFlag | null;
  availableSeats: number;
  departureConstraints: TimeIntervalConstraint;
  returnConstraints: TimeIntervalConstraint | null | undefined;
  name: string;
};

export type PublishContext = {
  request: Partial<InternalLianeRequest>;
  created?: Liane | undefined;
};

type NextEvent = { type: "NEXT"; data: Partial<InternalLianeRequest> };

type UpdateEvent = { type: "UPDATE"; data: Partial<InternalLianeRequest> };
type EditEvent = { type: "EDIT"; data: PublishStepsKeys };
type PublishEvent = { type: "PUBLISH" };

type OpenMapEvent = { type: "MAP"; data: "from" | "to" };
type BackEvent = { type: "BACK" };
type ReturnEvent = { type: "RETURN"; data: null | undefined | Date };
type NameEvent = { type: "NAME"; data: null | undefined | string };
type InternalEvents = ServiceDoneEvent<Liane>;

type Event = SubmittingEvents | PublishEvent | NextEvent | EditEvent | UpdateEvent | OpenMapEvent | BackEvent | ReturnEvent | NameEvent;

export type PublishStateMachine = StateMachine<PublishContext, Schema, Event | InternalEvents>;

export type PublishStateMachineInterpreter = Interpreter<PublishContext, Schema, Event>;

const createState = <T>(nextTarget: string, nextCondition?: (context: T) => boolean, previousState?: string) => {
  // @ts-ignore
  const index = previousState ? PublishStateSequence.indexOf(previousState) : -1;

  const editableStates =
    index >= 0
      ? {
          EDIT: PublishStateSequence.slice(0, index + 1).map(state => {
            return { target: "#publish." + state, cond: (_: PublishContext, event: EditEvent) => event.data === state };
          })
        }
      : {};
  return {
    initial: "fill",
    states: {
      fill: {
        on: {
          UPDATE: [
            {
              actions: ["set"],
              target: "#publish." + nextTarget,
              cond: nextCondition
                ? /* @ts-ignore */
                  (context: PublishContext, event: UpdateEvent) => nextCondition({ request: { ...context.request, ...event.data } })
                : () => false
            },
            {
              actions: ["set"]
            }
          ],
          NEXT: {
            target: "#publish." + nextTarget,
            actions: ["set"]
          },
          ...editableStates
        }
      },
      edit: {
        on: {
          NEXT: {
            actions: ["set"],
            target: "#publish.overview",
            cond: nextCondition ? nextCondition : () => true
          }
        }
      },
      enter: {
        always: [
          {
            target: "#publish." + nextTarget + ".enter",
            cond: nextCondition ? nextCondition : () => true
          },
          {
            target: "fill"
          }
        ]
      }
    }
  };
};

export const CreatePublishLianeMachine = (
  submit: (formData: PublishContext) => Promise<CoLianeRequest>,
  initialValue?: Partial<InternalLianeRequest> | undefined
): PublishStateMachine => {
  const states = createStateSequence<PublishContext, PublishStepsKeys>(
    {
      trip: { validation: context => !!context.request.from && !!context.request.to && context.request.from.id !== context.request.to.id },
      days: { validation: context => context.request.recurrence !== "0000000" },
      time: { validation: context => !!context.request.departureConstraints },
      vehicle: { validation: context => !!context.request.availableSeats }
    },
    "overview",
    createState
  );
  //@ts-ignore
  states.trip.on = {
    MAP: [
      {
        target: "#publish.map.from",
        cond: (context: PublishContext, event: OpenMapEvent) => event.data === "from"
      },
      {
        target: "#publish.map.to",
        cond: (context: PublishContext, event: OpenMapEvent) => event.data === "to"
      }
    ],

    //@ts-ignore
    ...states.trip.on
  };
  return createMachine(
    {
      id: "publish",
      predictableActionArguments: true,
      context: { request: initialValue || {} },
      initial: "route",
      states: {
        route: {
          always: { target: "#publish.trip" + (initialValue ? ".enter" : ".fill") }
        },
        ...states,
        map: {
          on: {
            UPDATE: {
              actions: ["set"],
              target: "#publish.trip.enter"
            },
            BACK: {
              target: "#publish.trip.enter"
            }
          },
          states: {
            from: {},
            to: {}
          }
        },
        return: {
          on: {
            BACK: {
              target: "#publish.overview.enter"
            },
            UPDATE: {
              actions: ["set"],
              target: "#publish.overview.enter"
            }
          }
        },
        name: {
          on: {
            BACK: {
              target: "#publish.overview.enter"
            },
            UPDATE: {
              actions: ["set"],
              target: "#publish.overview.enter"
            }
          }
        },
        overview: {
          initial: "enter",
          states: { enter: {} },
          on: {
            EDIT: PublishStateSequence.map(state => {
              return { target: "#publish." + state + ".edit", cond: (_: PublishContext, event: EditEvent) => event.data === state };
            }),
            UPDATE: {
              actions: ["set"]
            },
            PUBLISH: {
              target: "#publish.submitting"
            },
            RETURN: {
              target: "#publish.return",
              actions: ["set"]
            },
            NAME: {
              target: "#publish.name",
              actions: ["set"]
            }
          }
        },
        submitting: CreateSubmittingState({
          onSuccess: "saveCreated",
          cancelTargetState: "#publish.overview",
          successTargetState: "#publish.done",
          submittingState: "#publish.submitting"
        }),
        done: { type: "final" }
      }
    },
    {
      services: {
        submit: (context, _) => submit(context)
      },
      actions: {
        saveCreated: assign<PublishContext, ServiceDoneEvent<Liane>>({ created: (_, event) => event.data }),
        set: assign<PublishContext, NextEvent>({
          request: (context, event) => {
            return {
              ...context.request,
              ...event.data
            };
          }
        })
      }
    }
  );
};

// @ts-ignore
export const PublishLianeContext = React.createContext<PublishStateMachineInterpreter>();
