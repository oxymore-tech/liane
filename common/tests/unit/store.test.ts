import { sync } from "../../src";

describe("store", () => {
  test("should sync lists", () => {
    const oldValues = ["a", "c", "d"];
    const newValues = ["a", "b", "c", "r"];
    const result = sync(
      newValues,
      oldValues,
      x => x,
      x => x,
      x => x
    );
    expect(result.added.sort()).toStrictEqual(["b", "r"]);
    expect(result.removed.sort()).toStrictEqual(["d"]);
    expect(result.stored.sort()).toStrictEqual(newValues);
  });
});
