import { getBoundingBox } from "../../src";

describe("geometry", () => {
  test("should compute bounding box", () => {
    const coordinates = [
      [1.602816, 44.836218],
      [1.60225, 44.93615],
      [1.702087, 44.936142],
      [1.601852, 44.93617],
      [1.598809, 45.136195]
    ];
    const result = getBoundingBox(coordinates);
    expect(result).toStrictEqual({
      sw: [1.598809, 44.836218], //southwestern
      ne: [1.702087, 45.136195], //northeastern
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0
    });
  });
});
