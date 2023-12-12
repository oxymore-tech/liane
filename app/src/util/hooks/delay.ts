import { useEffect, useState } from "react";
import { UTCDateTime } from "@liane/common";

export const useRealtimeDelay = (props: { at: UTCDateTime; delay: number; isMoving: boolean } | undefined) => {
  const [delay, setDelay] = useState<number>(() => {
    if (!props) {
      return 0;
    }
    return props.isMoving ? (new Date().getTime() - new Date(props.at).getTime()) / 1000 : props.delay;
  });

  useEffect(() => {
    if (!props) {
      return;
    } else {
      const timeout = setInterval(() => {
        if (props!.isMoving) {
          setDelay((new Date().getTime() - new Date(props!.at).getTime()) / 1000);
        } else {
          setDelay(props!.delay);
        }
      }, 15 * 1000);
      return () => clearInterval(timeout);
    }
  }, [props]);

  return delay;
};
