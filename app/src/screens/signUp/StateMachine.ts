import { assign, createMachine, Interpreter, StateMachine } from "xstate";

import React from "react";
import { AuthUser } from "@/api";

type StateKeys = "phone" | "code" | "form" | "done";

type Schema = {
  states: {
    [name in StateKeys]: {};
  };
};

export type SignUpContext = {
  phone?: string | undefined;
  authUser?: AuthUser | undefined;
};

type NextEvent = { type: "NEXT" };
type PhoneEvent = { type: "SET_PHONE"; data: { phone: string } };
type LoginEvent = { type: "LOGIN"; data: { authUser: AuthUser } };

type Event = NextEvent | LoginEvent | PhoneEvent;

export type SignUpStateMachine = StateMachine<SignUpContext, Schema, Event>;

export type SignUpStateMachineInterpreter = Interpreter<SignUpContext, Schema, Event>;

export const CreateSignUpMachine = (initialValue: SignUpContext = {}): SignUpStateMachine => {
  return createMachine(
    {
      id: "signUp",
      predictableActionArguments: true,
      context: initialValue,
      initial: "phone",
      states: {
        phone: {
          on: {
            SET_PHONE: {
              actions: [
                assign<SignUpContext, PhoneEvent>({
                  phone: (context, event) => event.data.phone
                })
              ],
              target: "#signUp.code"
            }
          }
        },
        code: {
          on: {
            LOGIN: [
              {
                cond: (ctx, event) => event.data.authUser.isSignedUp,
                actions: ["set"],
                target: "#signUp.done"
              },
              {
                actions: ["set"],
                target: "#signUp.form"
              }
            ]
          }
        },
        form: {
          on: {
            NEXT: {
              target: "done"
            }
          }
        },
        done: { type: "final" }
      }
    },
    {
      actions: {
        set: assign<SignUpContext, LoginEvent>({
          authUser: (context, event) => event.data.authUser
        })
      }
    }
  );
};

// @ts-ignore
export const SignUpLianeContext = React.createContext<SignUpStateMachineInterpreter>();
