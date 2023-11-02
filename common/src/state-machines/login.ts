import { assign, createMachine, Interpreter, StateMachine } from "xstate";
import { AuthUser } from "../api";
import { CreateSubmittingState, ServiceDoneEvent, SubmittingEvents } from "../util";

type StateKeys = "phone" | "code" | "form" | "done";

type Schema = {
  states: {
    [name in StateKeys]: NonNullable<unknown>;
  };
};
type Field = {
  value?: string;
  valid?: boolean;
};
export type SignUpContext = {
  phone: Field;
  code: Field;
  authUser?: AuthUser;
};

type NextEvent = { type: "NEXT" };
type FillEvent = { type: "SET"; data: string };
type ResendCodeEvent = { type: "RESEND" };

type Event = NextEvent | FillEvent | ResendCodeEvent | SubmittingEvents;
type InternalEvents = ServiceDoneEvent<AuthUser>;

export type SignUpStateMachine = StateMachine<SignUpContext, Schema, Event | InternalEvents>;

export type SignUpStateMachineInterpreter = Interpreter<SignUpContext, Schema, Event>;

export const CreateLoginMachine = (
  services: {
    sendPhone: (phone: string) => Promise<void>;
    sendCode: (phone: string, code: string) => Promise<AuthUser>;
  },
  testAccount?: string,
  allowSignUp: boolean = true
): SignUpStateMachine => {
  return createMachine(
    {
      id: "signUp",
      predictableActionArguments: true,
      context: { phone: {}, code: {} },
      initial: "phone",

      states: {
        phone: {
          initial: "fill",
          on: {
            SET: {
              actions: "setPhone",
              target: "#signUp.phone.fill"
            }
          },
          states: {
            fill: {
              on: {
                NEXT: {
                  target: "#signUp.phone.submitting",
                  cond: context => !!(context.phone.value && context.phone.valid)
                }
              }
            },
            submitting: CreateSubmittingState({
              cancelTargetState: "#signUp.phone.fill",
              submittingState: "#signUp.phone.submitting",
              successTargetState: "#signUp.code",
              serviceId: "sendPhone"
            })
          }
        },
        code: {
          initial: "fill",
          on: {
            SET: {
              actions: "setCode",
              target: "#signUp.code.fill"
            }
          },
          states: {
            fill: {
              on: {
                NEXT: {
                  target: "#signUp.code.submitting",
                  cond: context => !!(context.code.value && context.code.valid)
                },
                RESEND: {
                  target: "#signUp.phone.submitting"
                }
              }
            },
            submitting: CreateSubmittingState({
              cancelTargetState: "#signUp.code.fill",
              submittingState: "#signUp.code.submitting",
              successTargetState: "#signUp.form",
              onSuccess: "setAuth",
              serviceId: "sendCode"
            })
          }
        },
        form: {
          always: {
            cond: context => context.authUser?.isSignedUp || !allowSignUp,
            target: "#signUp.done"
          },
          on: {
            NEXT: {
              actions: ["setSignedUp"],
              target: "done"
            }
          }
        },

        done: { type: "final" }
      }
    },
    {
      services: {
        sendPhone: (context: SignUpContext) => services.sendPhone(context.phone.value!),
        sendCode: (context: SignUpContext) => services.sendCode(context.phone.value!, context.code.value!)
      },
      actions: {
        setPhone: assign<SignUpContext, FillEvent>({
          phone: (_, event) => ({
            value: event.data,
            valid: (!!testAccount && event.data === testAccount) || /^((\+?33)|0)[67]\d{8}$/.test(event.data)
          })
        }),
        setCode: assign<SignUpContext, FillEvent>({
          code: (context, event) => ({
            value: event.data,
            valid: (!!testAccount && context.phone.value === testAccount) || /^\d{6}$/.test(event.data)
          })
        }),
        setAuth: assign<SignUpContext, ServiceDoneEvent<AuthUser>>({
          authUser: (_, event) => event.data
        }),
        setSignedUp: assign<SignUpContext, NextEvent>({
          authUser: context => ({ ...context.authUser!, isSignedUp: true })
        })
      }
    }
  );
};
