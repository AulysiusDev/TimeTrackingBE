import { createTimeEntriesService } from "../../services/common/create-entries-service.js";
import {
  addUsernamesAndPhotoThumbs,
  calculateDataPoints,
  fetchEntriesService,
  filterAutoConfigEntries,
} from "../../services/common/fetch-entries-service.js";
import { deleteByIds } from "../../services/crud.js";
import schemas from "../../schema/schemas.js";
import { fetchAccessKey } from "../../auth/oauth.js";
import { cacheAccessKey } from "../../auth/cache.js";

// Handle requests to create time entries
export async function createTimeEntriesController(req, res) {
  const { entryData } = req.body;
  // Valudate body data
  if (!entryData) {
    return res.status(400).json({
      message: "No log data was provided to create a time entry with.",
      data: [],
    });
  }
  try {
    // Create entries for multiple people and multiple dates if selected
    const result = await createTimeEntriesService(entryData);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error", data: [] });
  }
}

// Fetch time entries from postgres
// Accepts params to fetch filtered data if selected
// Will fetch data from any table with nay filters
export async function fetchTimeEntriesController(req, res) {
  // Filters MUST INCLUDE these 3 params min:
  // targetName, tableName, targetType (must be string: group, item, board or workspace)
  const { filters } = req.body;
  if (!filters || !filters.creatorId) {
    return res.status(400).json({
      message: "Invalid inputs.",
      data: [],
    });
  }
  try {
    //  Cache access key
    const accessKeyRes = await fetchAccessKey(filters.creatorId);
    if (accessKeyRes.status === 401) {
      return accessKeyRes;
    }
    cacheAccessKey(filters.creatorId, accessKeyRes.data);
    const fetchEntriesRes = await fetchEntriesService(filters);
    console.log({ fetchEntriesRes });
    if (fetchEntriesRes.status !== 200) {
      return res.status(fetchEntriesRes.status).json(fetchEntriesRes);
    }
    if (fetchEntriesRes.data.length) {
      const { tableName, targetType } = filters;
      switch (tableName) {
        case "logs":
          const addUsernamesAndPhotoThumbsRes =
            await addUsernamesAndPhotoThumbs(
              fetchEntriesRes.data,
              filters.creatorId
            );
          let metrics;
          metrics = calculateDataPoints(
            addUsernamesAndPhotoThumbsRes.data,
            targetType
          );

          return res.status(200).json({
            message: "Success",
            data: metrics,
          });
        case "users":
          return res.status(200).json({
            message: "Success",
            data: fetchEntriesRes.data,
          });

        case "logConfigs":
          const filteredLogConfigDEntries = filterAutoConfigEntries(
            fetchEntriesRes.data,
            filters.targetId
          );
          return res.status(200).json({
            message: "Success",
            data: filteredLogConfigDEntries,
          });

        default:
          return res.status(400).json({
            message: "Invalid table name",
            data: [],
          });
      }
    }
    let total = 0;
    let billable = 0;
    let subitemTotal = 0;
    let subitemBillable = 0;
    let itemLogs = [];
    let subitemLogs = [];
    let logs = [];
    // Standard return
    return res.status(200).json({
      message: fetchEntriesRes.message || "Success",
      data: fetchEntriesRes.data || {
        logs,
        itemLogs,
        subitemLogs,
        total,
        billable,
        subitemTotal,
        subitemBillable,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({
      message: error.message || "Internal server error.",
      data: error,
    });
  }
}

export const deleteEntriesController = async (req, res) => {
  const { ids, table } = req.body;
  //   Check ids exist
  if (!ids) {
    return res.status(400).json({ message: "No valid entry IDs provided." });
  }
  if (!table) {
    return res.status(400).json({ message: "No table name provided." });
  }
  if (!schemas[table]) {
    return res.status(400).json({ message: `Invalid table name: ${table}.` });
  }
  try {
    //   Perform deletion from db
    const deleteRes = await deleteByIds(schemas[table], schemas[table].id, ids);
    return res
      .status(deleteRes.status)
      .json({ message: deleteRes.message, data: deleteRes.data });
  } catch (error) {
    console.error("Error deleting entries: ", error);
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal sever error", data: error });
  }
};
