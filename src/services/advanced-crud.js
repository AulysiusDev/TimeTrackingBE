import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getDrizzleDbClient } from "./db-client.js";
import {
  AutomationConfigTable,
  LogsTable,
  UsersTable,
} from "../schema/schemas.js";

export async function findLogs(params) {
  const { userId, boardId, workspaceId, startDate, endDate, team } = params;
  try {
    const db = await getDrizzleDbClient();
    let query = db.select().from(LogsTable);
    if (userId || team) {
      query = query.leftJoin(
        UsersTable,
        eq(LogsTable.userId, UsersTable.userId)
      );
    }
    const conditions = [];
    if (userId) conditions.push(eq(LogsTable.userId, userId));
    if (workspaceId) conditions.push(eq(LogsTable.workspaceId, workspaceId));
    if (startDate) conditions.push(gte(LogsTable.date, startDate));
    if (endDate) conditions.push(lte(LogsTable.date, endDate));
    if (team) conditions.push(eq(UsersTable.team, team));
    if (boardId) {
      const validItemIds = db
        .select({ id: ItemsTable.id })
        .from(ItemsTable)
        .where(eq(ItemsTable.boardId, boardId));
      conditions.push(inArray(LogsTable.itemId, validItemIds));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const results = await query.execute();
    if (results.length > 0) {
      return {
        message: "Entries fetched successfully.",
        status: 200,
        data: results,
      };
    } else {
      return {
        message: "No entries found matching the criteria.",
        status: 404,
        data: [],
      };
    }
  } catch (error) {
    console.error(error);
    return { message: "Error fetching entries.", status: 500, data: null };
  }
}

export const findAutomationConfigs = async (
  boardId,
  groupId = null,
  itemId = null
) => {
  try {
    const db = await getDrizzleDbClient();
    let query = db.select().from(AutomationConfigTable);
    const conditions = [];
    if (!boardId) {
      return { message: "No board id provided.", status: 400, data: [] };
    } else {
      conditions.push(eq(AutomationConfigTable.boardId, boardId));
    }
    if (!itemId) {
      conditions.push(eq(AutomationConfigTable.itemId, null));
    } else {
      conditions.push(eq(AutomationConfigTable.itemId, itemId));
    }
    if (groupId) {
      conditions.push(eq(AutomationConfigTable.groupId, groupId));
    }
    if (conditions.length > 0) {
      query = query.where(...conditions);
    }
    const results = await query.execute();
    if (results.length > 0) {
      return {
        message: "Entries fetched successfully.",
        status: 200,
        data: results,
      };
    } else {
      return {
        message: "No automation configs found matching this criteria.",
        status: 404,
        data: [],
      };
    }
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error fetching automation configs.",
      status: error.status || 500,
      data: error,
    };
  }
};

// So multiple updates are done at the same time

// ERROR, NEON DOESN'T SUPPORT TRANSACTION, KEEP TO USE IF WE SWTCH TO AWS OR SOMTHING ELSE THAT DOE SUPPORT TRANSACTIONS
export const updateMultipleFields = async (
  schema,
  schemaId,
  updateObjsArr,
  id
) => {
  try {
    const db = await getDrizzleDbClient();
    return await db.transaction(async (tx) => {
      try {
        const results = [];

        for (const updateObj of updateObjsArr) {
          const result = await tx
            .update(schema)
            .set(updateObj.values)
            .where(eq(schemaId, id))
            .returning({ updatedField: updateObj.field });
          results.push(result);
        }
        return { message: "Success", status: 200, data: results };
      } catch (error) {
        console.error(error);
        tx.rollback();
        throw error;
      }
    });
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error updating fields.",
      status: error.status || 500,
      data: error,
    };
  }
};
