import { useEffect, useState } from "react";
import { UTCDateTime } from "@liane/common";

const getDelayInSeconds = (delay: number, at: UTCDateTime, moving: boolean) => {
  const now = new Date().getTime();
  const d = (now - new Date(at).getTime()) / 1000;
  return moving ? delay - d : delay + d;
};

export const useRealtimeDelay = (props: { at: UTCDateTime; delay: number; isMoving: boolean } | undefined) => {
  const [delay, setDelay] = useState<number>(0);

  useEffect(() => {
    if (!props) {
      return;
    } else {
      setDelay(getDelayInSeconds(props.delay, props.at, props.isMoving));
      const timeout = setInterval(() => {
        setDelay(getDelayInSeconds(props.delay, props.at, props.isMoving));
      }, 15 * 1000);
      return () => clearInterval(timeout);
    }
  }, [props]);

  return delay;
};
