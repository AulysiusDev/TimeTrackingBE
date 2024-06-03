import initMondayClient from "monday-sdk-js";
import { findById } from "./crud.js";
import schemas from "../schema/schemas.js";

export async function fetchLogs(itemId) {
  let itemsLogs = [];
  let subitemsLogs = [];

  // Fetch items db
  try {
    let itemlogsRes = await findById(
      schemas.LogsTable,
      schemas.LogsTable.itemId,
      itemId
    );
    if (itemlogsRes.status === 200) {
      itemsLogs = itemlogsRes.data;
    } else if (itemlogsRes.status === 500) {
      return {
        message: "There was an error fetching items",
        status: 500,
        data: [],
      };
    }
    // Fetch subitems from db based on parentItemId
    const subitems = await findById(
      schemas.ItemsTable,
      schemas.ItemsTable.parentItemId,
      itemId
    );
    if (subitems.status === 500) {
      return {
        message: "There was an error fetching items",
        status: 500,
        data: [],
      };
    } else if (subitems.status === 200) {
      for (const subitem of subitems.data) {
        const newSubitemLogs = await findById(
          schemas.LogsTable,
          schemas.LogsTable.itemId,
          subitem.id
        );
        // Process and add subitems
        if (newSubitemLogs.status === 200) {
          newSubitemLogs.data.forEach((log) => subitemsLogs.push(log));
        } else {
          return {
            message: "There was an error fetching items",
            status: 500,
            data: [],
          };
        }
      }
    }
  } catch (error) {
    console.error(error);
    return {
      message: "There was an error fetching items",
      status: 500,
      data: [],
    };
  }
  // Return values to controller
  return { message: "Success", status: 200, data: { itemsLogs, subitemsLogs } };
}

export function sumHours(itemsLogs, subitemsLogs) {
  let subitemTotal = 0;
  let subitemBillable = 0;
  let total = 0;
  let billable = 0;
  // Extract item hours
  for (const log of itemsLogs) {
    total += parseFloat(log.totalHours);
    billable += parseFloat(log.billableHours);
  }
  // Extract subitem hours
  for (const subitemLog of subitemsLogs) {
    subitemTotal += parseFloat(subitemLog.totalHours);
    subitemBillable += parseFloat(subitemLog.billableHours);
  }

  return { subitemBillable, subitemTotal, total, billable };
}

export async function addUsernames(logs) {
  const mondayClient = initMondayClient();
  mondayClient.setToken(process.env.MONDAY_API_TOKEN);
  let usersArr;
  // Remove dublicates
  let uniqueUserIdsArr = createUniqueIdsArr(logs);
  // Fetch names from monday api
  try {
    const query = `query {
        users (ids: ${JSON.stringify(uniqueUserIdsArr)}) {
          id
          name
        }
      }
      `;

    const response = await mondayClient.api(query);
    usersArr = await response.data.users;
  } catch (error) {
    console.error(error);
    return {
      message:
        "Error matching records with usernames. Please validate database.",
      status: 500,
      data: error,
    };
  }
  // Add usernames to logs
  for (let user of usersArr) {
    const userId = parseInt(user.id);
    logs.forEach((log) => {
      if (log.userId === userId) {
        log.username = user.name;
      }
    });
  }
  return { message: "Success fetching usernames", status: 200, data: logs };
}

// Remove id dublicates
export function createUniqueIdsArr(itemsLogs) {
  const mondayClient = initMondayClient();
  mondayClient.setToken(process.env.MONDAY_API_TOKEN);
  const uniqueIdsArr = new Set();
  for (const log of itemsLogs) {
    uniqueIdsArr.add(log.userId);
  }
  return Array.from(uniqueIdsArr);
}
