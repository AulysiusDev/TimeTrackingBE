import { getDrizzleDbClient } from "./db-client.js";
import { eq, inArray } from "drizzle-orm";

export async function createEntry(schema, value) {
  try {
    const db = await getDrizzleDbClient();
    const results = await db.insert(schema).values(value).returning();
    return {
      message: `${results.length} entr${
        results.length > 1 ? "ies" : "y"
      } created successfully`,
      status: 201,
      data: results,
    };
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error creating time logs",
      status: error.status || 500,
      data: error,
    };
  }
}

export async function findById(schema, schemaId, id) {
  try {
    const db = await getDrizzleDbClient();
    const results = await db
      .select()
      .from(schema)
      .where(eq(schemaId, parseInt(id)));
    if (results.length > 0) {
      return {
        message: `${results.length} entr${
          results.length > 1 ? "ies" : "y"
        } fetched successfully.`,
        status: 200,
        data: results,
      };
    } else {
      return {
        message: "No entries found matching this id.",
        status: 404,
        data: [],
      };
    }
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error fetching entries",
      status: error.status || 500,
      data: error,
    };
  }
}

export async function findInArray(schema, schemaId, array) {
  if (array.length === 0) {
    return { message: "No ids provided for search.", status: 400, data: [] };
  }
  try {
    const db = await getDrizzleDbClient();
    const results = await db
      .select()
      .from(schema)
      .where(inArray(schemaId, array));
    if (results.length > 0) {
      return {
        message: `${results.length > 1 ? "s" : ""} entr${
          results.length > 1 ? "ies" : "y"
        } fetched successfully`,
        status: 200,
        data: results,
      };
    } else {
      return {
        message: "No entries found matching these ids.",
        status: 404,
        data: [],
      };
    }
  } catch (error) {
    console.error(error);
    return {
      message: error?.message || "Error fetching users from ids",
      status: error?.status || 500,
      data: error,
    };
  }
}

export async function deleteByIds(schema, schemaId, ids) {
  if (!Array.isArray(ids)) {
    ids = [ids];
  }
  try {
    const db = await getDrizzleDbClient();
    const res = await db
      .delete(schema)
      .where(inArray(schemaId, ids))
      .returning({ deletedId: schemaId });
    return { message: "Deleted successfully", status: 200, data: res };
  } catch (error) {
    console.error("Error deleting logs:", error);
    return {
      message: error?.message || "Error deleting logs",
      status: error?.status || 500,
      data: error,
    };
  }
}

// **Example input for updateField**
// updateField(
//   schemas.LogConfigTable,
//   schemas.LogConfigTable.id,
//   schemas.LogConfigTable.startDate,
//   { startDate: null },
//   logId
// );
export async function updateField(
  schema,
  schemaId,
  schemaField,
  updateObj,
  id
) {
  try {
    const db = await getDrizzleDbClient();
    const updatedValue = await db
      .update(schema)
      .set(updateObj)
      .where(eq(schemaId, id))
      .returning({ updatedField: schemaField });
    return { message: "Success", status: 200, data: updatedValue };
  } catch (error) {
    console.error(error);
    return {
      message: error?.message || "Error updating field",
      status: error?.status || 500,
      data: error,
    };
  }
}
