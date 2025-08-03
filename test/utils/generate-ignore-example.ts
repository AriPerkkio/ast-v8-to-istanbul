import { generateReports, test } from "./index";

test("ignore examples", async ({ __coverageMaps }) => {
  generateReports(__coverageMaps.v8, "./ignore-examples");
});
