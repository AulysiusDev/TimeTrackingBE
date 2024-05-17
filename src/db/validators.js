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
    automate: z.boolean(),
    automationId: z.number().nullable(),
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
    hasError = true;
    message = "Invalid log data";
  }
  return {
    data: validLogData,
    hasError: hasError,
    message: "",
  };
}
