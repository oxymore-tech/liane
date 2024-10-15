import React, { DependencyList } from "react";
import { BehaviorSubject, Observable, Subject, Subscribable, SubscriptionLike } from "rxjs";

export const useSubscription = <T>(observable: Subscribable<T>, callback: (v: T) => void, deps: DependencyList) => {
  React.useEffect(() => {
    const sub = observable.subscribe({ next: callback });
    return () => {
      sub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export const useSubscriptionValue = <T>(subscribe: (callback: (v: T) => void) => SubscriptionLike) => {
  const [value, setValue] = React.useState<T>();
  React.useEffect(() => {
    const sub = subscribe(v => setValue(v));
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return value;
};

export const useObservable = <T>(observable: Observable<T>, defaultValue: T) => {
  const [value, setValue] = React.useState<T>(defaultValue);
  React.useEffect(() => {
    const sub = observable.subscribe(v => {
      //  console.debug("rec observed value ->", v);
      setValue(v);
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return value;
};

export const useSubject = <T>() => {
  return React.useMemo(() => {
    return new Subject<T>();
  }, []);
};

export const useBehaviorSubject = <T>(initialValue: T) => {
  return React.useMemo(() => {
    return new BehaviorSubject<T>(initialValue);
  }, []);
};
