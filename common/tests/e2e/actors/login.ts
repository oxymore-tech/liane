import { AuthService, CreateLoginMachine, SignUpContext, SignUpPayload, ValidationError } from "../../../src";
import { Semaphore } from "async-mutex";
import { interpret } from "xstate";
import { TestEnv } from "../setup/environment";

export class LoginActor {
  constructor(private auth: AuthService) {}
  runScenario = (
    onDone: (ctx: SignUpContext) => void,
    fail: (reason: any) => void,
    userPhone: string,
    user?: SignUpPayload | undefined,
    maxRetries: number = 1
  ) => {
    const semaphore = new Semaphore(0);
    let currentAction = "phone";
    let retriesLeft = maxRetries;
    const signUpMachine = CreateLoginMachine(
      {
        sendPhone: phone => this.auth.sendSms(phone),
        sendCode: (phone, code) => this.auth.login({ phone, code }),
        signUpUser: payload => this.auth.updateUserInfo(payload)
      },
      TestEnv.TEST_ACCOUNT,
      !!user
    );
    const service = interpret(signUpMachine);
    const actions: { [k: string]: () => void } = {
      phone: () => {
        service.send("SET", { data: userPhone });
        service.send("NEXT");
      },
      code: () => {
        service.send("SET", { data: TestEnv.TEST_CODE });
        service.send("NEXT");
      },
      form: () => service.send("SIGNUP", { data: user }),
      retry: () => {
        retriesLeft--;
        if (retriesLeft < 0) fail("Too many retries");
        service.send("RETRY");
      }
    };

    const states = [];

    service.onTransition(state => {
      states.push(state.value);
      const stateStrings = state.toStrings();
      console.log(stateStrings);
      if (state.matches("done")) {
        onDone(state.context);
      } else if (stateStrings[stateStrings.length - 1].endsWith("failure")) {
        if (state.context.error instanceof ValidationError) {
          fail(state.context.error);
        }
        currentAction = "retry";
        semaphore.release(1);
      } else if (stateStrings[stateStrings.length - 1].endsWith("fill") && stateStrings[0] !== currentAction) {
        currentAction = stateStrings[0];
        semaphore.release(1);
      }
    });

    service.start();
    const executeAction = async () => {
      actions[currentAction]();
      if (currentAction !== "form") {
        await semaphore.acquire(1);
        await executeAction();
      }
    };
    executeAction();
  };

  signUpUser = (phone: string) => new Promise<string>((resolve, reject) => this.runScenario(ctx => resolve(ctx.authUser!.id), reject, phone));
}
