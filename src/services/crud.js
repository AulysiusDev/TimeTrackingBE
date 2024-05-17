import { getDrizzleDbClient } from "./db-client.js";
import { desc, eq, inArray } from "drizzle-orm";
import schemas from "../schema/schemas.js";

export async function addUser({ user }) {
  const db = await getDrizzleDbClient();
  const results = await db.insert(schemas.UsersTable).values(user).returning();
  return results[0];
}
export async function listUsers() {
  const db = await getDrizzleDbClient();
  const results = await db
    .select()
    .from(schemas.UsersTable)
    .orderBy(desc(schemas.UsersTable.createdAt));
  return results;
}
export async function getUser(id) {
  const db = await getDrizzleDbClient();
  const result = await db
    .select()
    .from(schemas.UsersTable)
    .where(eq(schemas.UsersTable.id, id));
  if (result.length === 1) {
    return result[0];
  }
  return "No user found";
}

export async function createLogEntry(logData) {
  try {
    const db = await getDrizzleDbClient();
    const results = await db
      .insert(schemas.LogsTable)
      .values(logData)
      .returning();
    return results[0];
  } catch (error) {
    console.error(error);
    return "Error creating Log entry";
  }
}

export async function createItemEntry(itemData) {
  try {
    const db = await getDrizzleDbClient();
    const results = await db
      .insert(schemas.ItemsTable)
      .values(itemData)
      .returning();
    return results[0];
  } catch (error) {
    console.error(error);
    return "Error creating Item entry";
  }
}
export async function fetchItem(id) {
  const db = await getDrizzleDbClient();
  let result;
  result = await db
    .select()
    .from(schemas.ItemsTable)
    .where(eq(schemas.ItemsTable.id, id));
  if (result.length) {
    return "Item entry exists";
  }
  return "No item found";
}

export async function fetchLogsById(id) {
  const db = await getDrizzleDbClient();
  let results;
  results = await db
    .select()
    .from(schemas.LogsTable)
    .where(eq(schemas.LogsTable.itemId, id));
  if (results.length) {
    return results;
  }
  return "No item found";
}
export async function fetchSubitemsByItemId(id) {
  const db = await getDrizzleDbClient();
  let results;
  results = await db
    .select()
    .from(schemas.ItemsTable)
    .where(eq(schemas.ItemsTable.parentItemId, id));
  if (results.length) {
    return results;
  }
  return "No subitems found";
}

export async function deleteLogsById(ids) {
  const db = await getDrizzleDbClient();
  try {
    const res = await db
      .delete(schemas.LogsTable)
      .where(inArray(schemas.LogsTable.id, ids))
      .returning({ deletedId: schemas.LogsTable.id });
    return res;
  } catch (error) {
    console.error("Error deleting logs:", error);
    return "Error deleting logs";
  }
}
