import { DayOfTheWeekFlag } from "./api";
import { TimeInSeconds } from "./util";

export class Localization {
  constructor(private locale: string) {}
  // Load date formatter
  private readonly monthDayFormatter = new Intl.DateTimeFormat(this.locale, {
    weekday: "long",
    month: "long",
    day: "2-digit"
  });

  private readonly shortMonthDayFormatter = new Intl.DateTimeFormat(this.locale, {
    weekday: "short",
    month: "short",
    day: "2-digit"
  });

  private readonly dateFormatter = new Intl.DateTimeFormat(this.locale, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit"
  });

  // Load time formatter
  private readonly timeFormatter = new Intl.DateTimeFormat(this.locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  private readonly monthYearFormatter = new Intl.DateTimeFormat(this.locale, {
    month: "long",
    year: "numeric"
  });

  private readonly time24hFormatter = new Intl.DateTimeFormat(this.locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  toRelativeDateString = (timestamp: Date, dateFormatterFunction: (date?: number | Date | undefined) => string = this.dateFormatter.format) => {
    let date;
    const now = new Date();

    if (now.getDate() === timestamp.getDate() && now.getMonth() === timestamp.getMonth() && now.getFullYear() === timestamp.getFullYear()) {
      date = "aujourd'hui";
    } else {
      date = dateFormatterFunction(timestamp);
    }

    return date;
  };

  toRelativeTimeString = (timestamp: Date, dateFormatterFunction: (date?: number | Date | undefined) => string = this.dateFormatter.format) => {
    return this.toRelativeDateString(timestamp, dateFormatterFunction) + " à " + this.timeFormatter.format(timestamp);
  };

  // TODO https://formatjs.io/docs/polyfills/intl-relativetimeformat
  /*const chatDatetimeFormatter = new Intl.RelativeTimeFormat(locale, {
    localeMatcher: "best fit",
    numeric: "auto"
  });*/

  formatMonthDay = this.monthDayFormatter.format;
  formatMonthYear = this.monthYearFormatter.format;
  formatShortMonthDay = this.shortMonthDayFormatter.format;
  formatDate = this.dateFormatter.format;
  formatTime24h = this.time24hFormatter.format;
  formatTime = (date?: number | Date | undefined) => {
    try {
      return this.timeFormatter.format(date);
    } catch (e) {
      return "--:--";
    }
  };

  formatDateTime = (date: Date) => {
    return `${this.formatMonthDay(date)} à ${this.formatTime(date)}`;
  };

  readonly daysList = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  formatDaysOfTheWeek = (daysOfTheWeek: DayOfTheWeekFlag) => {
    return this.daysList
      .filter((_day: string, index: number) => daysOfTheWeek?.charAt(index) === "1")
      .map((day: string) => `${day.toLocaleLowerCase()}s`)
      .join(", ");
  };

  formatDuration = (duration: TimeInSeconds) => {
    if (duration < 60) {
      return "1 min";
    }
    return duration >= 3600
      ? Math.floor(duration / 3600) +
          "h" +
          Math.floor((duration % 3600) / 60)
            .toString()
            .padStart(2, "0")
      : Math.floor(duration / 60).toString() + " min";
  };
}
