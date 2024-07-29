import { findLogs } from "../advanced-crud.js";

export async function findEntries(params) {
  const logs = await findLogs(params);
  console.log({ logs });
}
