import {
  validateAndCreateItem,
  validateAndCreateUsers,
  validateAndCreateLog,
} from "../services/entry-service.js";
import {
  deleteLogsById,
  fetchLogsById,
  fetchSubitemsByItemId,
} from "../services/crud.js";
import { addUsernames } from "../services/display-service.js";
import {
  configTimeStamps,
  convertJsonToCsv,
  convertJsonToXLSX,
} from "../services/export-service.js";

export async function createTimeEntry(req, res) {
  const validatedItem = await validateAndCreateItem(req.body);
  if (validatedItem.status === 500) {
    return res.status(500).json({ message: "Server error." });
  }
  if (validatedItem.status === 400) {
    return res.status(400).json({ message: "Client error." });
  }
  // Validate and create user entry
  const userIds = req.body.userIds || [];
  let validatedUserIds = [];
  if (userIds.length) {
    for (const userId of userIds) {
      const validatedUserId = await validateAndCreateUsers({ id: userId });
      if (validatedUserId.status === 500 || validatedUserId.status === 400) {
        return res.status(validatedUserId.status).json(validatedUserId);
      }
      validatedUserIds.push(validatedUserId.data);
      // Create time log for each user here
    }
    // Validate LogTable entry data
    // Make LogTable entry
    let newLogs = [];
    for (const userIds of validatedUserIds) {
      let logData = {
        userId: userIds,
        itemId: validatedItem.data.id,
        date: new Date(req.body.date),
        totalHours: req.body.totalHours,
        billableHours: req.body.billableHours,
        note: req.body.note,
      };
      const newLogEntry = await validateAndCreateLog(logData);
      if (newLogEntry.status === 500) {
        return res.status(500).json(newLogEntry);
      } else if (newLogEntry.status === 400) {
        return res.status(400).json(newLogEntry);
      }
      newLogs.push(newLogEntry);
    }
    // Throw error if no userIds send with request.
    return res
      .status(201)
      .json({ message: "Time entry created successfully", data: newLogs });
  } else {
    return res
      .status(400)
      .json({ message: "No user ids provided. Please select a user" });
  }
}

export async function fetchHours(req, res) {
  const itemId = req.body.itemId;
  let itemsLogs = [];
  let subitemsLogs = [];
  let subitemTotal = 0;
  let subitemBillable = 0;
  let total = 0;
  let billable = 0;
  try {
    let itemlogsRes = await fetchLogsById(itemId);
    if (itemlogsRes !== "No item found") {
      itemsLogs = itemlogsRes;
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "There was an error fetching these items" });
  }
  try {
    const subitems = await fetchSubitemsByItemId(itemId);
    for (const subitem of subitems) {
      const newSubitemLogs = await fetchLogsById(subitem.id);
      if (newSubitemLogs !== "No item found") {
        newSubitemLogs.forEach((log) => subitemsLogs.push(log));
      }
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "There was an error fetching these subitems" });
  }
  for (const log of itemsLogs) {
    total += parseFloat(log.totalHours);
    billable += parseFloat(log.billableHours);
  }
  for (const subitemLog of subitemsLogs) {
    subitemTotal += parseFloat(subitemLog.totalHours);
    subitemBillable += parseFloat(subitemLog.billableHours);
  }
  const itemLogsWithUsernames = await addUsernames(itemsLogs);
  const subitemsLogsWithUsernames = await addUsernames(subitemsLogs);
  if (itemLogsWithUsernames === "Error finding names") {
    return res.status(500).json({
      message:
        "Error matching records with usernames. Please validate database.",
    });
  }
  const itemLogs = itemLogsWithUsernames;
  const subitemLogs = subitemsLogsWithUsernames;
  return res.status(200).json({
    total,
    billable,
    itemLogs,
    subitemLogs,
    subitemBillable,
    subitemTotal,
  });
}

export async function deleteEntries(req, res) {
  const { ids } = req.body;
  if (!ids) {
    return res.status(400).json({ message: "No entry IDs send." });
  }
  const deleteRes = await deleteLogsById(ids);
  if (deleteRes === "Error deleting logs") {
    return res.status(500).json({ message: deleteRes, data: deleteRes });
  }
  return res
    .status(200)
    .json({ message: "Logs deleted successfully", data: deleteRes });
}

export async function generateXlsx(req, res) {
  let { logs } = req.body;
  logs = configTimeStamps(logs);
  const { excelBuffer } = convertJsonToXLSX(logs);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="log.xlsx"`);
  res.status(200).send(excelBuffer);
}

export async function generateCsv(req, res) {
  let { logs } = req.body;
  logs = configTimeStamps(logs);
  const csvFile = convertJsonToCsv(logs);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="log.csv"`);
  res.status(200).send(csvFile);
}
