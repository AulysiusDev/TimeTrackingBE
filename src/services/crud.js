import { getDrizzleDbClient } from "./db-client.js";
import { eq, inArray } from "drizzle-orm";

export async function createEntry(schema, value) {
  try {
    const db = await getDrizzleDbClient();
    const results = await db.insert(schema).values(value).returning();
    return {
      message: "Entry created successfully",
      status: 201,
      data: results[0],
    };
  } catch (error) {
    console.error(error);
    return { message: "Failed to create entry", status: 500, data: null };
  }
}

export async function findById(schema, schemaId, id) {
  try {
    const db = await getDrizzleDbClient();
    const results = await db.select().from(schema).where(eq(schemaId, id));
    if (results.length > 0) {
      return {
        message: "Entry/s fetched successfully",
        status: 200,
        data: results,
      };
    } else {
      return {
        message: "No entries found matching this id",
        status: 404,
        data: [],
      };
    }
  } catch (error) {
    console.error(error);
    return { message: "Error fetching entry", status: 500, data: null };
  }
}

export async function deleteByIds(schema, schemaId, ids) {
  const idsArr = [...ids];
  try {
    const db = await getDrizzleDbClient();
    const res = await db
      .delete(schema)
      .where(inArray(schemaId, idsArr))
      .returning({ deletedId: schemaId });
    return { message: "Deleted successfully", status: 200, data: res };
  } catch (error) {
    console.error("Error deleting logs:", error);
    return { message: "Error deleting logs", status: 500, data: null };
  }
}
