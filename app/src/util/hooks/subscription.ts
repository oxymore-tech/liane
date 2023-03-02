import { useEffect, useState } from "react";
import { Observable, SubscriptionLike } from "rxjs";

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

export const useObservable = <T>(observable: Observable<T>) => {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const sub = observable.subscribe(v => {
      setValue(v);
    });
    return () => {
      sub.unsubscribe();
    };
  }, [observable]);
  return value;
};
