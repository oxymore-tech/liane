import { useLocalization } from "@/api/intl";
import React, { useMemo } from "react";
import { addSeconds } from "@liane/common";
import { Datepicker } from "flowbite-react";

export const DatePicker = ({ date, setDate }: { date: Date | undefined; setDate: (d: Date | undefined) => void }) => {
  const WebLocalization = useLocalization();
  const defaultDate = useMemo(() => addSeconds(new Date(), 3600 * 24), []);

  return (
    <Datepicker
      className="cursor-pointer"
      defaultDate={defaultDate}
      onSelectedDateChanged={d => {
        if (d === defaultDate) setDate(undefined);
        else setDate(d);
      }}
      value={date === undefined ? "--/--/--" : WebLocalization.formatDate(date)}
    />
  );
};
