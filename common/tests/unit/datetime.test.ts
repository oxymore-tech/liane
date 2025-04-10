import { DateUtils, DayOfWeekFlag, getFirstFutureDate } from "../../src";

describe("recurrence", () => {
  test("should get next day", () => {
    const date = new Date("2023-08-28T08:10:00.000Z");
    const days: DayOfWeekFlag = "0100000";
    const nextDate = getFirstFutureDate(date, days);
    expect(nextDate?.toISOString()).toEqual("2023-08-29T08:10:00.000Z");
  });

  test("should get same day", () => {
    const date = new Date("2023-08-28T08:10:00.000Z");
    const days: DayOfWeekFlag = "1100000";
    const nextDate = getFirstFutureDate(date, days);
    expect(nextDate?.toISOString()).toEqual("2023-08-28T08:10:00.000Z");
  });
});

describe("DateUtils", () => {
  test("today is within last week", () => {
    const now = new Date("2025-04-10T16:00:00.000Z");
    const date = new Date("2025-04-09T15:00:00.000Z");
    const actual = DateUtils.isWithinLastWeek(date, now);
    expect(actual).toEqual(true);
  });

  test("day-7 is within last week", () => {
    const now = new Date("2025-04-10T16:00:00.000Z");
    const date = new Date("2025-04-04T16:00:00.000Z");
    const actual = DateUtils.isWithinLastWeek(date, now);
    expect(actual).toEqual(true);
  });

  test("should check a day is not within last week", () => {
    const now = new Date("2025-04-10T16:00:00.000Z");
    const date = new Date("2025-04-03T16:00:00.000Z");
    const actual = DateUtils.isWithinLastWeek(date, now);
    expect(actual).toEqual(false);
  });

  test("31 march is within last week", () => {
    const now = new Date("2025-04-02T16:00:00.000Z");
    const date = new Date("2025-03-31T16:00:00.000Z");
    const actual = DateUtils.isWithinLastWeek(date, now);
    expect(actual).toEqual(true);
  });

  test("04/04 is not within last week", () => {
    const now = new Date("2025-04-02T16:00:00.000Z");
    const date = new Date("2025-04-04T16:00:00.000Z");
    const actual = DateUtils.isWithinLastWeek(date, now);
    expect(actual).toEqual(false);
  });

  test("26/03 is not within last week", () => {
    const now = new Date("2025-04-02T16:00:00.000Z");
    const date = new Date("2025-04-26T16:00:00.000Z");
    const actual = DateUtils.isWithinLastWeek(date, now);
    expect(actual).toEqual(false);
  });
});
