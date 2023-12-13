import { useEffect, useState } from "react";
import { UTCDateTime } from "@liane/common";

export const useRealtimeDelay = (props: { at: UTCDateTime; delay: number; isMoving: boolean } | undefined) => {
  const [delay, setDelay] = useState<number>(() => {
    if (!props) {
      return 0;
    }
    return props.delay - (props.isMoving ? (new Date().getTime() - new Date(props.at).getTime()) / 1000 : 0);
  });

  useEffect(() => {
    if (!props) {
      return;
    } else {
      const timeout = setInterval(() => {
        if (props!.isMoving) {
          setDelay(props.delay - (new Date().getTime() - new Date(props!.at).getTime()) / 1000);
        } else {
          setDelay(props!.delay);
        }
      }, 15 * 1000);
      return () => clearInterval(timeout);
    }
  }, [props]);

  return delay;
};
