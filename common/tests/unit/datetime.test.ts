import { DayOfWeekFlag, getFirstFutureDate } from "../../src";

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
