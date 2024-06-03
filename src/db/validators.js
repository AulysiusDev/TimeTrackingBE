import { z } from "zod";

export async function validateUser(userData) {
  const user = z.object({
    id: z.number(),
  });
  let hasError;
  let validData = {};
  let message;
  try {
    validData = user.parse(userData);
    hasError = false;
  } catch (error) {
    console.error(error);
    hasError = true;
    message = "Invalid user id";
  }
  return {
    data: validData,
    hasError: hasError,
    message: "",
  };
}

export async function validateItem(itemData) {
  const item = z.object({
    id: z.number(),
    isSubitem: z.boolean(),
    parentItemId: z.number().nullable(),
    name: z.string(),
    boardId: z.number(),
    workspaceId: z.number(),
  });
  let hasError;
  let validData = {};
  let message;
  try {
    validData = item.parse(itemData);
    hasError = false;
  } catch (error) {
    console.error(error);
    hasError = true;
    message = "Invalid item";
  }
  return {
    data: validData,
    hasError: hasError,
    message: "",
  };
}

export async function validateLog(logData) {
  const log = z.object({
    userId: z.number(),
    itemId: z.number(),
    date: z.date(),
    totalHours: z.number(),
    billableHours: z.number(),
    note: z.string(),
  });
  let hasError;
  let validLogData = {};
  let message;
  try {
    validLogData = log.parse(logData);
    hasError = false;
  } catch (error) {
    console.error(error);
    console.log("Log validation error");
    hasError = true;
    message = "Invalid log data";
  }
  return {
    data: validLogData,
    hasError: hasError,
    message: "",
  };
}

export async function validateAutomation(automationData) {
  const labelSchema = z.object({
    label: z.string(),
    index: z.number(),
  });
  const automation = z.object({
    default: z.boolean(),
    statusColumnId: z.string(),
    startLabels: z.array(labelSchema).nonempty(),
    pauseLabels: z.array(labelSchema).nonempty(),
    endLabels: z.array(labelSchema).nonempty(),
  });
  let hasError;
  let validAutomationData = {};
  let message;
  try {
    validAutomationData = automation.parse(automationData);
    hasError = false;
  } catch (error) {
    console.error(error);
    console.log("Automation validation error");
    hasError = true;
    message = "Invalid automation data";
  }
  return {
    data: validAutomationData,
    hasError: hasError,
    message: "",
  };
}

export async function validateLogConfig(logConfigData) {
  const logConfig = z.object({
    userId: z.number(),
    itemId: z.number(),
    subitemId: z.number().nullable(),
    automationId: z.number().nullable(),
    automateActive: z.boolean(),
  });
  let hasError;
  let validLogConfigData = {};
  let message;
  try {
    validLogConfigData = logConfig.parse(logConfigData);
    hasError = false;
  } catch (error) {
    console.error(error);
    console.log("Log Config validation error");
    hasError = true;
    message = "Invalid Log Config data";
  }
  return {
    data: validLogConfigData,
    hasError: hasError,
    message: "",
  };
}
