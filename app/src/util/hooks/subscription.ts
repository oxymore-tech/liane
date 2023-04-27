import { useEffect, useMemo, useState } from "react";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";

export const useSubscription = <T>(subscribe: (callback: (v: T) => void) => SubscriptionLike) => {
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
  }, [observable]); //TODO dep here ?
  return value;
};

export const useSubject = <T>() => {
  const subject = useMemo(() => {
    return new Subject<T>();
  }, []);
  return subject;
};

export const useBehaviorSubject = <T>(initialValue: T) => {
  const subject = useMemo(() => {
    return new BehaviorSubject<T>(initialValue);
  }, [initialValue]);
  return subject;
};
