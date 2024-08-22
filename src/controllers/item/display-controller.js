import schemas from "../../schema/schemas.js";
import { deleteByIds } from "../../services/crud.js";
import {
  addUsernames,
  fetchLogs,
  sumHours,
} from "../../services/item/display-service.js";

export async function fetchHours(req, res) {
  // Define variables
  const itemId = req.body.itemId;
  let itemsLogs = [];
  let subitemsLogs = [];

  //   Fetch subitem and item logs from itemId
  if (itemId) {
    const { message, status, data } = await fetchLogs(itemId);
    if (status === 500) {
      return res.status(status).json({ message: message, data: data });
    } else if (status === 404) {
      return res.status(404).json({
        total: 0,
        billable: 0,
        itemLogs: [],
        subitemLogs: [],
        subitemBillable: 0,
        subitemTotal: 0,
      });
    } else {
      itemsLogs = data.itemsLogs;
      subitemsLogs = data.subitemsLogs;
    }
  } else {
    return res.status(400).json({ message: "Invalid Item ID", data: null });
  }

  //   Sum the total hours figures
  const { billable, total, subitemBillable, subitemTotal } = sumHours(
    itemsLogs,
    subitemsLogs
  );

  //   Fetch usernames from monday api and add them to the logs
  const itemLogsWithUsernames = await addUsernames(itemsLogs);
  const subitemsLogsWithUsernames = await addUsernames(subitemsLogs);
  if (itemLogsWithUsernames.status === 500) {
    return res.status(500).json({
      message: message,
      data: data,
    });
  }
  const itemLogs = itemLogsWithUsernames.data;
  const subitemLogs = subitemsLogsWithUsernames.data;
  //   Send values to client
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
  const { ids, table } = req.body;
  //   Check ids exist
  if (!ids) {
    return res.status(400).json({ message: "No entry IDs send." });
  }
  if (!table) {
    return res.status(400).json({ message: "No table name provided." });
  }
  if (!schemas[table]) {
    return res.status(400).json({ message: "Invalid table name provided." });
  }
  //   Perform deletion from db
  const deleteRes = await deleteByIds(schemas[table], schemas[table].id, ids);
  if (deleteRes.status === 500) {
    return res.status(500).json({ message: deleteRes, data: deleteRes });
  }
  return res
    .status(200)
    .json({ message: "Logs deleted successfully", data: deleteRes.data });
}
