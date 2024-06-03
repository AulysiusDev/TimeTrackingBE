// tests/utils.test.js

import { createUniqueIdsArr } from "../src/services/display-service";

describe("createUniqueIdsArr", () => {
  test("returns an array of unique user IDs", () => {
    const itemsLogs = [
      { userId: 1 },
      { userId: 2 },
      { userId: 1 },
      { userId: 3 },
    ];

    const uniqueIds = createUniqueIdsArr(itemsLogs);
    expect(uniqueIds).toEqual([1, 2, 3]);
  });

  test("returns an empty array when given an empty input", () => {
    const itemsLogs = [];
    const uniqueIds = createUniqueIdsArr(itemsLogs);
    expect(uniqueIds).toEqual([]);
  });
});
