import { RallyingPoint } from "@/api";
import { assign, createMachine, Interpreter, StateMachine } from "xstate";

import { createStateSequence, CreateSubmittingState, SubmittingEvents } from "@/util/xstateHelpers";
import React from "react";

export const PublishStateSequence = ["trip", "date", "vehicle"] as const;

export type PublishStepsKeys = (typeof PublishStateSequence)[number];

type StateKeys = PublishStepsKeys | "overview" | "submitting";

type Schema = {
  states: {
    [name in StateKeys]: {};
  };
};

export type InternalLianeRequest = {
  to: RallyingPoint;
  from: RallyingPoint;
  departureTime: Date;
  availableSeats: number;
};

export type PublishContext = {
  request: Partial<InternalLianeRequest>;
};

type NextEvent = { type: "NEXT"; data: Partial<InternalLianeRequest> };

type UpdateEvent = { type: "UPDATE"; data: Partial<InternalLianeRequest> };
type EditEvent = { type: "EDIT"; data: PublishStepsKeys };
type PublishEvent = { type: "PUBLISH" };

type Event = SubmittingEvents | PublishEvent | NextEvent | EditEvent | UpdateEvent;

export type PublishStateMachine = StateMachine<PublishContext, Schema, Event>;

export type PublishStateMachineInterpreter = Interpreter<PublishContext, Schema, Event>;

const createState = <T>(nextTarget: string, nextCondition?: (context: T) => boolean, previousState?: string) => {
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
              cond: nextCondition ? (context, event) => nextCondition({ request: { ...context.request, ...event.data } }) : () => false
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
        always: {
          target: "#publish." + nextTarget + ".enter",
          cond: nextCondition ? nextCondition : () => true
        }
      }
    }
  };
};

export const CreatePublishLianeMachine = (
  submit: (formData: PublishContext) => Promise<void>,
  initialValue?: Partial<InternalLianeRequest> | undefined
): PublishStateMachine => {
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
        ...createStateSequence<PublishContext, PublishStepsKeys>(
          {
            trip: { validation: context => !!context.request.from && !!context.request.to },
            date: { validation: context => !!context.request.departureTime },
            vehicle: { validation: context => !!context.request.availableSeats }
          },
          "overview",
          createState
        ),
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
            }
          }
        },
        submitting: { ...CreateSubmittingState("publish"), type: "final" }
      }
    },
    {
      services: {
        submit: (context, _) => submit(context)
      },
      actions: {
        set: assign<PublishContext, NextEvent>({
          request: (context, event) => {
            console.log("update", event.data);
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