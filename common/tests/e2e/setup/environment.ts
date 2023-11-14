import * as process from "process";
export const TestEnv = {
  API_URL: process.env.VITE_API_URL ?? "http://localhost:5000",
  TILES_ULR: process.env.VITE_TILES_ULR ?? "http://localhost:3000",
  TEST_CODE: process.env.VITE_TEST_CODE ?? "333333",
  TEST_ACCOUNT: "0000111111"
};
