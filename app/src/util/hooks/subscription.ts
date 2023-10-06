import { useEffect, useMemo, useState } from "react";
import { BehaviorSubject, Observable, Subject, Subscribable, SubscriptionLike } from "rxjs";

export const useSubscription = <T>(observable: Subscribable<T>, callback: (v: T) => void) => {
  useEffect(() => {
    const sub = observable.subscribe({ next: callback });
    return () => {
      sub.unsubscribe();
    };
  }, []);
};

export const useSubscriptionValue = <T>(subscribe: (callback: (v: T) => void) => SubscriptionLike) => {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const sub = subscribe(v => setValue(v));
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return value;
};

export const useObservable = <T>(observable: Observable<T>, defaultValue: T) => {
  const [value, setValue] = useState<T>(defaultValue);
  useEffect(() => {
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
  return useMemo(() => {
    return new Subject<T>();
  }, []);
};

export const useBehaviorSubject = <T>(initialValue: T) => {
  return useMemo(() => {
    return new BehaviorSubject<T>(initialValue);
  }, []);
};
