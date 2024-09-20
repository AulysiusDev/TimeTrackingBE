import { z } from "zod";

export async function validateUser(userObj) {
  const user = z.object({
    id: z.number(),
    name: z.number().nullable(),
  });
  let hasError;
  let validData = {};
  let message;
  try {
    validData = user.parse(userObj);
    hasError = false;
  } catch (error) {
    console.error(error);
    console.log("User validation error");
    hasError = true;
    message = "Invalid user data";
  }
  return {
    data: validData,
    hasError: hasError,
    message: "",
  };
}
export async function validateRatecard(rateCardObj) {
  const user = z.object({
    id: z.number(),
    ratePerHour: z.number().nullable(),
    startTime: z.number().nullable(),
    endTime: z.number().nullable(),
    currency: z.string().nullable(),
    days: z.array(z.number()).nullable(),
  });
  let hasError;
  let validData = {};
  let message;
  try {
    validData = user.parse(userObj);
    hasError = false;
  } catch (error) {
    console.error(error);
    console.log("Ratecard validation error");
    hasError = true;
    message = "Invalid ratecard data";
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
    itemId: z.string().nullable(),
    subitemId: z.string().nullable(),
    boardId: z.string().nullable(),
    groupId: z.string().nullable(),
    workspaceId: z.string(),
    targetName: z.string().nullable(),
    date: z.date(),
    totalHours: z.number(),
    billableHours: z.number(),
    note: z.string(),
    ratePerHour: z.number().nullable(),
    currency: z.string().nullable(),
    status: z.number().nullable(),
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

export async function validateAutomationConfig(logConfigData) {
  const logConfig = z.object({
    name: z.string(),
    workspaceId: z.number(),
    boardId: z.number(),
    groupId: z.string().nullable(),
    userId: z.number(),
    itemId: z.number(),
    startDate: z.date(),
    custom: z.boolean(),
    schedule: z.number(),
    customDays: z.array(z.number()).nullable(),
    default: z.boolean(),
    statusColumnId: z.string(),
    peopleColumnId: z.string(),
    startLabels: z.array(z.string()).nonempty(),
    endLabels: z.array(z.string()).nonempty(),
    rateCardId: z.number().nullable(),
    ratePerHour: z.number().nullable(),
    currency: z.string().nullable(),
    endTime: z.number().nullable(),
    startTime: z.number().nullable(),
    subitemId: z.number().nullable(),
    active: z.boolean(),
    hours: z.number().nullable(),
    category: z.string(),
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

export const validateSchedule = (config) => {
  switch (config.schedule) {
    case 0:
      return validateScheduleZero(config);
    case 1:
      return validateScheduleOne(config);
    case 2:
      return validateScheduleTwo(config);
    default:
      return false;
  }
};

export const validateScheduleZero = (autoConfig) => {
  return autoConfig.startTime && autoConfig.hours;
};

export const validateScheduleOne = (autoConfig) => {
  return (
    autoConfig.startTime &&
    autoConfig.endTime &&
    ((autoConfig.custom && autoConfig.customDays.length) || !autoConfig.custom)
  );
};
export const validateScheduleTwo = (autoConfig) => {
  return autoConfig.peopleColumnId || autoConfig.rateCardId;
};
