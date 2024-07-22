import schemas from "../../schema/schemas.js";
import { updateField } from "../../services/crud.js";

import {
  validateAndCreateItem,
  validateAndCreateUsers,
} from "../../services/item/entry-service.js";
import {
  fetchLogConfigs,
  formatLogConfigs,
  validateAndCreateLogConfig,
} from "../../services/item/log-config-service.js";

export async function getLogConfig(req, res) {
  const { itemId, boardId } = req.body;
  const item = boardId === null;
  const id = boardId === null ? itemId : boardId;
  let logConfigs;
  const logConfigRes = await fetchLogConfigs(id, item);
  if (logConfigRes.status === 500) {
    return res
      .status(500)
      .json({ message: logConfigRes.message, data: logConfigRes.data });
  }
  logConfigs = logConfigRes.data;
  const formattedLogConfigs = await formatLogConfigs(logConfigs);
  res.status(200).json({ message: "success", data: formattedLogConfigs });
}

export async function createLogConfigEntry(req, res) {
  // Validate and create item
  const validatedItem = await validateAndCreateItem(req.body);
  if (validatedItem.status === 500) {
    return res.status(500).json({ message: "Server error." });
  }
  if (validatedItem.status === 400) {
    return res.status(400).json({ message: "Client error." });
  }
  const userObj = {
    id: parseInt(req.body.creatorId),
    ratePerHour: null,
    startTime: null,
    endTime: null,
    currency: null,
    days: null,
  };
  const validatedUser = await validateAndCreateUsers(userObj);
  if (validatedUser.status === 500 || validatedUser.status === 400) {
    return res.status(validatedUser.status).json(validatedUser);
  }
  const logConfigObj = {
    itemId: req.body.itemId,
    subitemId: req.body.subitemId,
    custom: req.body.custom,
    customDays: req.body.customDays,
    default: req.body.default,
    statusColumnId: req.body.statusColumnId,
    startLabels: req.body.startLabels,
    endLabels: req.body.endLabels,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    name: req.body.name,
    rateCardId: req.body.rateCardId,
    ratePerHour: parseFloat(req.body.ratePerHour),
    currency: req.body.currency,
    boardId: req.body.boardId,
    userId: req.body.creatorId,
    startDate: new Date(),
    schedule: req.body.schedule,
    peopleColumnId: req.body.peopleColumnId,
    active: req.body.active,
    workspaceId: req.body.workspaceId,
    hours: parseFloat(req.body.hours),
  };
  const validatedLogConfig = await validateAndCreateLogConfig(logConfigObj);
  if (validatedLogConfig.status === 500) {
    return res.status(validatedLogConfig.status).json({
      message: validatedLogConfig.message,
      data: validatedLogConfig.data,
    });
  }
  const newLogConfigObj = {
    ...validatedLogConfig.data,
    customDays: JSON.parse(validatedLogConfig.data.customDays) || [],
    startLabels: JSON.parse(validatedLogConfig.data.startLabels) || [],
    endLabels: JSON.parse(validatedLogConfig.data.endLabels) || [],
  };
  return res.status(201).json(newLogConfigObj);
}

export async function startStopAutomation(req, res) {
  const { logId, action } = await req.body;
  const startStopRes = await updateField(
    schemas.LogConfigTable,
    schemas.LogConfigTable.id,
    schemas.LogConfigTable.active,
    { active: action },
    logId
  );
  const startDateRes = await updateField(
    schemas.LogConfigTable,
    schemas.LogConfigTable.id,
    schemas.LogConfigTable.startDate,
    { startDate: null },
    logId
  );

  if (startStopRes.status === 500 || startDateRes === 500) {
    const message = startDateRes.message === "Success";
    return res.status(500).json({ message: startStopRes.message, data: {} });
  }
  const updatedFields = {
    active: startStopRes.data[0].updatedField,
    startDate: startDateRes.data[0].updatedField,
  };
  console.log("success");
  console.log({ updatedFields });
  return res.status(200).json({ message: "Success", data: { updatedFields } });
}
