import {
  validateAndCreateItem,
  validateAndCreateUsers,
  validateAndCreateLog,
} from "../services/entry-service.js";

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
    for (const userId of validatedUserIds) {
      let logData = {
        userId: userId,
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
      newLogs.push(newLogEntry.data);
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
