import { and, eq, lte, gte } from "drizzle-orm";
import { LogConfigTable, LogsTable, UsersTable } from "../../schema/schemas.js";
import { getDrizzleDbClient } from "../db-client.js";

// Will fetch data from any table with nay filters
// NEED: targetName, tableName, targetType (must be string: group, item, board or workspace)
export const fetchEntriesService = async (filters = {}) => {
  let {
    tableName,
    targetId,
    targetType,
    userId,
    boardId,
    workspaceId,
    startDate,
    endDate,
    team,
    groupId,
  } = filters;

  //   Invalid input, need a table to fetch from.
  if (!tableName) {
    return { message: "No table specified.", status: 400, data: [] };
  }

  // Set correct table interact with
  const tableMapping = {
    users: UsersTable,
    logs: LogsTable,
    logConfig: LogConfigTable,
  };
  const table = tableMapping[tableName.toLowerCase()];
  // Ensure table exists
  if (!table) {
    return { message: "Invalid table specified.", status: 400, data: [] };
  }
  //   Connect to neon postgres db
  const db = await getDrizzleDbClient();

  let query = db.select().from(table).$dynamic();

  if ((userId || team) && tableName !== "users") {
    query = query.leftJoin(UsersTable, eq(table.userId, UsersTable.id));
  }
  const conditions = [];

  if (userId) {
    if (tableName === "users") {
      conditions.push(eq(table.id, userId));
    } else {
      conditions.push(eq(table.userId, userId));
    }
  }
  //   Push conditions to match filter settings
  if (team) conditions.push(eq(UsersTable.team, team));
  if (workspaceId) conditions.push(eq(table.workspaceId, workspaceId));
  //   > start date
  if (startDate) conditions.push(gte(table.date, startDate));
  //   < end date
  if (endDate) conditions.push(lte(table.date, endDate));
  if (boardId) conditions.push(eq(table.boardId, boardId));
  if (groupId) conditions.push(eq(table.groupId, groupId));

  //   Let requests fetch logs or logConfigs for specific targets
  //   ...allows creating logs are targets other than just items

  // Handles request for logs specific to the tables below
  const targetTypeMapping = {
    item: LogsTable.itemId,
    group: LogsTable.groupId,
    board: LogsTable.boardId,
    workspace: LogsTable.workspaceId,
  };

  const targetColumn = targetTypeMapping[targetType];
  // Target type doesn't match any of the table mappings
  if (targetType && !targetColumn) {
    return { message: "Invalid target type.", status: 400, data: [] };
  } else if (targetColumn) {
    conditions.push(eq(targetColumn, targetId));
  }

  // Add filter conditions if filters were applied
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  try {
    const results = await query.execute();
    if (results.length > 0) {
      return {
        message: `Successfully fetched ${results.length} entries from ${tableName} table.`,
        status: 200,
        data: results,
      };
    } else {
      return {
        message: "No entries found matching search params.",
        status: 200,
        data: [],
      };
    }
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "There was a eror fetching data",
      data: error,
      status: error.status || 500,
    };
  }
};

// Calculate key data points fro logs for client
export const calculateDataPoints = (fetchedLogs, targetType) => {
  let total = 0;
  let billable = 0;
  let subitemTotal = 0;
  let subitemBillable = 0;
  let itemLogs = [];
  let subitemLogs = [];
  let logs = [];

  fetchedLogs.forEach((log) => {
    if (targetType === "item") {
      if (!log.subitemId) {
        itemLogs.push(log);
        total += parseFloat(log.total);
        billable += parseFloat(log.billable);
      } else {
        subitemLogs.push(log);
        subitemTotal += parseFloat(log.total);
        subitemBillable += parseFloat(log.billable);
      }
    } else {
      logs.push(log);
      total += parseFloat(log.total);
      billable += parseFloat(log.billable);
    }
  });
  return {
    logs,
    itemLogs,
    subitemLogs,
    total,
    billable,
    subitemTotal,
    subitemBillable,
  };
};

// Filters logs based on the target
export const filterLogConfigDEntries = (logs, targetId) => {
  return (
    logs.filter(
      (logConfig) =>
        JSON.stringify(logConfig.userId) === JSON.stringify(targetId) ||
        JSON.stringify(logConfig.groupId) === JSON.stringify(targetId) ||
        JSON.stringify(logConfig.boardId) === JSON.stringify(targetId) ||
        JSON.stringify(logConfig.workspaceId) === JSON.stringify(targetId) ||
        JSON.stringify(logConfig.itemId) === JSON.stringify(targetId)
    ) || []
  );
};
