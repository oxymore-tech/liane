import { UTCDateTime } from "../api";

export type Hours = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;
export type Minutes =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59;

export type TimeOnly = { hour: Hours; minute?: Minutes };

export type MinuteStep = 1 | 2 | 3 | 5 | 10 | 15 | 20 | 30;

export class TimeOnlyUtils {
  static fromDate(date: Date | UTCDateTime, minuteStep: MinuteStep = 1): TimeOnly {
    const d = date instanceof Date ? date : new Date(date);
    const minutes = ((Math.ceil(d.getMinutes() / minuteStep) * minuteStep) % 60) as Minutes;
    return { hour: d.getHours() as Hours, minute: minutes };
  }

  static toDate(value: TimeOnly, inputDate?: Date): Date {
    const date = inputDate ?? new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), value.hour, value.minute ?? 0);
  }

  static now(minuteStep: MinuteStep = 5) {
    return TimeOnlyUtils.fromDate(new Date(), minuteStep);
  }

  static trim(date: TimeOnly, minDate?: TimeOnly, maxDate?: TimeOnly): TimeOnly {
    if (minDate && TimeOnlyUtils.compare(date, minDate) < 0) {
      return minDate;
    }
    if (maxDate && TimeOnlyUtils.compare(date, maxDate) > 0) {
      return maxDate;
    }
    return date;
  }

  static compare(a: TimeOnly, b: TimeOnly): number {
    if (a.hour < b.hour) {
      return -1;
    }
    if (a.hour > b.hour) {
      return 1;
    }
    if (a.minute === undefined) {
      return b.minute === undefined ? 0 : -1;
    }
    if (b.minute === undefined) {
      return 1;
    }
    return a.minute - b.minute;
  }
}

export type TimeRange = {
  start: TimeOnly;
  end: TimeOnly;
};
