import { validateAutomation, validateLogConfig } from "../db/validators.js";
import schema from "../schema/schemas.js";
import schemas from "../schema/schemas.js";
import { createEntry, deleteByIds, findById } from "./crud.js";

export async function fetchLogConfig(itemId) {
  try {
    const res = await findById(
      schemas.LogConfigTable,
      schemas.LogConfigTable.itemId,
      itemId
    );
    if (res.status === 500) {
      return { message: "Failed to fetch", status: 500, data: null };
    }
    return { message: "Success", status: 200, data: res.data };
  } catch (error) {
    console.error(error);
    return { message: "Failed to fetch", status: 500, data: null };
  }
}

export async function validateAndCreateAutomation(body) {
  let automationExists = false;
  let dbAutomationId;

  // First check if the item already has an automation and delete if it does
  const existingLogConfig = await findById(
    schemas.LogConfigTable,
    schemas.LogConfigTable.itemId,
    body.itemId
  );
  if (existingLogConfig.status === 500) {
    return "Failed to interact with automations table";
  }
  if (
    existingLogConfig.status === 200 &&
    existingLogConfig?.data?.automationId
  ) {
    automationExists = true;
    dbAutomationId = existingLogConfig.data.automationId;
  }

  // Create and validate new automation entry obj
  const autoObj = {
    default: body.default,
    statusColumnId: body.statusColumnId,
    startLabels: body.startLabels,
    pauseLabels: body.pauseLabels,
    endLabels: body.endLabels,
  };
  const { data, message, hasError } = await validateAutomation(autoObj);
  if (hasError === true) {
    return {
      message: message ? message : "Invalid request. Please try again.",
      data: { hasError },
      status: 400,
    };
  } else if (hasError === undefined) {
    return {
      message: message ? message : "Data validaton error.",
      data: { hasError },
      status: 500,
    };
  }
  // Add new obj to the automations table
  const newAutoObjRes = await createEntry(schemas.AutomationTable, data);
  if (newAutoObjRes.status === 500) {
    return newAutoObjRes;
  }

  // Delete old automation if it exists
  if (automationExists) {
    const deleteAutoRes = await deleteByIds(
      schemas.AutomationTable,
      dbAutomationId
    );
    if (deleteAutoRes.status === 500) {
      return deleteAutoRes;
    }
  }
  return newAutoObjRes;
}

export async function validateAndCreateLogConfig(body) {
  const logConfigObj = {
    userId: parseInt(body.creatorId),
    itemId: parseInt(body.itemId),
    subitemId: body.subitemId ? parseInt(body.subitemId) : null,
    automationId: parseInt(body.automationId),
    automateActive: true,
  };

  const { message, hasError, data } = await validateLogConfig(logConfigObj);
  if (hasError === true) {
    return {
      message: message ? message : "Invalid request. Please try again.",
      data: { hasError },
      status: 400,
    };
  } else if (hasError === undefined) {
    return {
      message: message ? message : "Data validaton error.",
      data: { hasError },
      status: 500,
    };
  }
  const createRes = await createEntry(schema.LogConfigTable, data);
  return createRes;
}
