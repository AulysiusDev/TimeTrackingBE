import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getDrizzleDbClient } from "./db-client.js";
import { LogsTable, UsersTable } from "../schema/schemas.js";

export async function findLogs(params) {
  // const { userId, boardId, workspaceId, startDate, endDate, team } = params;
  // const db = await getDrizzleDbClient();
  // let query = db.select().from(LogsTable);
  // if (userId || team) {
  //   query = query.leftJoin(UsersTable, eq(LogsTable.userId, UsersTable.userId));
  // }
  // const conditions = [];
  // if (userId) conditions.push(eq(LogsTable.userId, userId));
  // if (workspaceId) conditions.push(eq(LogsTable.workspaceId, workspaceId));
  // if (startDate) conditions.push(gte(LogsTable.date, startDate));
  // if (endDate) conditions.push(lte(LogsTable.date, endDate));
  // if (team) conditions.push(eq(UsersTable.team, team));
  // if (boardId) {
  //   const validItemIds = db
  //     .select({ id: ItemsTable.id })
  //     .from(ItemsTable)
  //     .where(eq(ItemsTable.boardId, boardId));
  //   conditions.push(inArray(LogsTable.itemId, validItemIds));
  // }
  // if (conditions.length > 0) {
  //   query = query.where(and(...conditions));
  // }
  // try {
  //   const results = await query.execute();
  //   console.log({ results });
  //   if (results.length > 0) {
  //     return {
  //       message: "Entries fetched successfully",
  //       status: 200,
  //       data: results,
  //     };
  //   } else {
  //     return {
  //       message: "No entries found matching the criteria",
  //       status: 404,
  //       data: [],
  //     };
  //   }
  // } catch (error) {
  //   console.error(error);
  //   return { message: "Error fetching entries", status: 500, data: null };
  // }
}
