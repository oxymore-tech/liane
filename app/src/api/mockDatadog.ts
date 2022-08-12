import {
  DdLogs,
  DdTrace,
  DdRum,
  DdSdkReactNative
} from "@datadog/mobile-react-native";

// To understand why this exists, see : https://github.com/DataDog/dd-sdk-reactnative/blob/develop/docs/expo_development.md

if (__DEV__) {
  console.log("Initializing DataDog mocks !");
  const emptyAsyncFunction = () => new Promise<void>((resolve) => resolve());

  DdLogs.debug = emptyAsyncFunction;
  DdLogs.info = emptyAsyncFunction;
  DdLogs.warn = emptyAsyncFunction;
  DdLogs.error = emptyAsyncFunction;

  DdTrace.startSpan = () => new Promise<string>((resolve) => resolve("fakeSpanId"));
  DdTrace.finishSpan = emptyAsyncFunction;
  DdRum.startView = emptyAsyncFunction;
  DdRum.stopView = emptyAsyncFunction;
  DdRum.startAction = emptyAsyncFunction;
  DdRum.stopAction = emptyAsyncFunction;
  DdRum.addAction = emptyAsyncFunction;
  DdRum.startResource = emptyAsyncFunction;
  DdRum.stopResource = emptyAsyncFunction;
  DdRum.addError = emptyAsyncFunction;
  DdRum.addTiming = emptyAsyncFunction;

  DdSdkReactNative.initialize = emptyAsyncFunction;
  DdSdkReactNative.setUser = emptyAsyncFunction;
  DdSdkReactNative.setAttributes = emptyAsyncFunction;
  DdSdkReactNative.setTrackingConsent = emptyAsyncFunction;
}