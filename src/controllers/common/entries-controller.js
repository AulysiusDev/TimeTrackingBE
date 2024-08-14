import { createTimeEntriesService } from "../../services/common/create-entries-service.js";
import {
  fetchEntriesService,
  filterLogConfigDEntries,
} from "../../services/common/fetch-entries-service.js";

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
  if (!filters) {
    return res.status(400).json({
      message: "Invalid inputs, target id and target type",
      data: [],
    });
  }
  try {
    const fetchEntriesRes = await fetchEntriesService(filters);
    if (fetchEntriesRes.status !== 200) {
      return res.status(fetchEntriesRes.status).json(fetchEntriesRes);
    }
    if (fetchEntriesRes.data.length) {
      const { tableName, targetType } = filters;

      switch (tableName) {
        case "logs":
          const metrics = calculateDataPoints(fetchEntriesRes.data, targetType);
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
          const filteredLogConfigDEntries = filterLogConfigDEntries(
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
    // Standard return
    return res.status(200).json({
      message: fetchEntriesRes.message || "Success",
      data: fetchEntriesRes.data || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({
      message: error.message || "Internal server error.",
      data: error,
    });
  }
}
