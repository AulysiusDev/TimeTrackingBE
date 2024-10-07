import { EnvironmentVariablesManager } from "@mondaycom/apps-sdk";
import jwt from "jsonwebtoken";
import { fetchUsers } from "./services/monday-service.js";
import { validateSchedule } from "./db/validators.js";
import { findById, findInArray } from "./services/crud.js";
import initMondayClient from "monday-sdk-js";
import { getCachedAccessKey } from "./auth/cache.js";
import { isBefore, isAfter, isSameDay, startOfDay, endOfDay } from "date-fns";
import { UsersTable } from "./schema/schemas.js";
const monday = initMondayClient();

const secretManager = new EnvironmentVariablesManager();
const DEVELOPMENT_ENV = "development";
const NODE_ENV = "NODE_ENV";

export const isDevelopmentEnv = () => {
  const currentEnv = (getSecret(NODE_ENV) || DEVELOPMENT_ENV).toLowerCase();
  return currentEnv === "development";
};
// Remove id dublicates
export const createUniqueIdsArr = (logs) => {
  if (!Array.isArray(logs) || !logs.length) {
    return [];
  }
  const uniqueIdsArr = new Set();
  for (const log of logs) {
    uniqueIdsArr.add(log.userId);
  }
  return Array.from(uniqueIdsArr);
};

export const getEnv = () =>
  (getSecret(NODE_ENV) || DEVELOPMENT_ENV).toLowerCase();

export const getSecret = (secretKey, options = {}) => {
  const secret = secretManager.get(secretKey, options);
  return secret;
};

export const verifySessionToken = (sessionToken) => {
  const decodedToken = jwt.verify(sessionToken, process.env.CLIENT_SECRET);
  return decodedToken;
};
// Create array of dates to create logs from using start and end dates
export const createDatesArray = (start, end, days = []) => {
  // Convert start and end to UTC dates (no time component)
  const startDate = new Date(start);

  const endDate = new Date(end);

  // If start and end are the same day, return that single date
  if (
    !end ||
    !validateDatesArray([end]) ||
    startDate.toISOString().split("T")[0] ===
      endDate.toISOString().split("T")[0]
  ) {
    return [startDate.toISOString().split("T")[0]];
  }

  // Multi-day range
  const datesArr = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    if (days.length === 0 || days.includes(currentDate.getDay())) {
      datesArr.push(currentDate.toISOString().split("T")[0]);
    }
    // Move to the next day
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Include the end date if it's one of the specified days
  if (
    days.includes(endDate.getDay()) &&
    !datesArr.some((date) => date === endDate.toISOString().split("T")[0])
  ) {
    datesArr.push(endDate.toISOString().split("T")[0]);
  }

  return datesArr;
};

export const validateDatesArray = (dates) => {
  return (
    Array.isArray(dates) &&
    dates.length &&
    dates.every((dateStr) => {
      const date = new Date(dateStr);
      return date instanceof Date && !isNaN(date);
    })
  );
};

export function calculateHours(autoConfig, current, type) {
  const currentDate = new Date(current);
  const endDate = new Date(autoConfig.endDate);
  const startDate = new Date(autoConfig.startDate);
  let maxHours =
    autoConfig.schedule === 1 || autoConfig.schedule === 2
      ? autoConfig.endTime - autoConfig.startTime
      : parseFloat(autoConfig.hours) || 0;
  let hours = 0;

  if (isSameDay(startDate, currentDate) && isSameDay(startDate, endDate)) {
    type = "single";
  }
  const startTimeFloat = getTimeFloat(startDate);
  const endTimeFloat = getTimeFloat(endDate);
  // Only relevant for start date and same date
  let startTime = Math.max(startTimeFloat, autoConfig.startTime);
  // Only relevant for end date and single date
  let endTime = Math.min(endTimeFloat, autoConfig.endTime);

  const calculateStartDate = () => {
    if (autoConfig.schedule === 0) {
      return Math.min(24 - startTime, maxHours);
    } else {
      return Math.min(autoConfig.endTime - startTime, maxHours);
    }
  };
  const calculateEndDate = () => {
    // Last day ended before configured start time, no hours for the last day
    if (endTimeFloat <= autoConfig.startTime) {
      return hours;
    }
    if (autoConfig.schedule === 0) {
      return Math.min(endTimeFloat - autoConfig.startTime, maxHours);
    } else {
      return Math.min(endTime - autoConfig.startTime, maxHours);
    }
  };
  const calculateSingleDate = () => {
    // Need to know if we started and ended it before start time or after the end time, 0 hours for that day
    if (
      endTimeFloat <= autoConfig.startTime ||
      startTimeFloat >= autoConfig.endTime
    ) {
      return hours;
    }
    if (autoConfig.schedule === 0) {
      return Math.min(24 - startTime, maxHours);
    } else {
      return Math.min(endTime - startTime, maxHours);
    }
  };

  switch (type) {
    case "middle":
      hours = maxHours;
      console.log("middle: ", hours);
      break;
    case "start":
      hours = calculateStartDate();
      console.log("start: ", hours);
      break;
    case "end":
      hours = calculateEndDate();
      console.log("end: ", hours);
      break;

    case "single":
      hours = calculateSingleDate();
      console.log("single: ", hours);
      break;
    default:
      hours = 0;
  }
  return hours;
}

export const safeJsonParse = (str, fallback) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

export const createEntryDataObj = (autoConfig) => {
  return {
    user: {
      ids:
        // Here, if there are no user ids, so no rate card id etc, then we must use the creator id instead to log against
        Array.isArray(autoConfig.userIds) && autoConfig.userIds.length
          ? [...autoConfig.userIds]
          : [{ id: autoConfig.userId }],
      creatorId: autoConfig.userId,
    },
    // Relevant
    item: {
      id: autoConfig.itemId,
      // might vhange this if we add subitems again
      subitemId: null,
      workspaceId: autoConfig.workspaceId,
      boardId: autoConfig.boardId,
      groupId: autoConfig.groupId,
    },
    schedule: {
      option: 0,
      multiDay: false,
      custom: false,
      days: [],
    },
    // relevant
    rateCard: {
      id: autoConfig.rateCardId || null,
      currency: autoConfig.currency || null,
      rate: autoConfig.rate || null,
    },
    autoConfig: {
      columns: {
        people: null,
        status: null,
      },
      labels: {
        start: [],
        end: [],
      },
      time: {
        start: null,
        end: null,
        hours: 0,
      },
      defaultStatusLabels: true,
      startDate: null,
    },
    // Relevant
    log: {
      name: autoConfig.name,
      note: autoConfig.note || null,
      date: autoConfig.date || null,
      endDate: "",
      category: autoConfig.category,
      hours: {
        total: parseFloat(autoConfig.hours),
        billable:
          autoConfig.category === "NB" ? 0 : parseFloat(autoConfig.hours),
      },
    },
  };
};
export const createUniqueHoursEntryDataObjects = (autoConfig, datesArray) => {
  // console.dir({ autoConfig }, { depth: null });
  let startDateEntryData = null;
  let middleDatesEntryData = null;
  let endDateEntryData = null;
  if (!Array.isArray(datesArray) || !datesArray.length) {
    return [startDateEntryData, middleDatesEntryData, endDateEntryData];
  }
  let dates = [...datesArray];
  const totalDates = dates.length;
  // We may have started the automation on a day which is not scheduled to work,
  // ...so before the first date in the dates array,
  // ...so we must make the start date the first one in the current array if it is not already
  const startDate = findStartDate(
    autoConfig.startDate,
    datesArray,
    autoConfig.userIds[0].timezoneOffset
  );
  console.log({ startDate });
  // Equally, the end date might be day we dont work, so we must make the end date the last current date
  // ...instead of the day we stopped the automation.
  const endDate = findEndDate(
    autoConfig.endDate,
    datesArray,
    autoConfig.userIds[0].timezoneOffset
  );
  console.log({ endDate });
  // Start date
  if (totalDates >= 1) {
    startDateEntryData = {
      entryData: createEntryDataObj(
        createAutoConfigWithHours(autoConfig, startDate, "start")
      ),
      dates: [startDate],
    };
    if (startDateEntryData.entryData.log.hours.total <= 0) {
      startDateEntryData = null;
    }
  }
  // end date
  if (totalDates >= 2) {
    endDateEntryData = {
      entryData: createEntryDataObj(
        createAutoConfigWithHours(autoConfig, endDate, "end")
      ),
      dates: [endDate],
    };
    if (endDateEntryData.entryData.log.hours.total <= 0) {
      endDateEntryData = null;
    }
  }
  // Middle dates
  if (totalDates > 2) {
    const middleDates = dates.slice(
      dates.indexOf(startDate.toISOString().split("T")[0]) + 1,
      dates.indexOf(endDate.toISOString().split("T")[0])
    );
    middleDatesEntryData = {
      entryData: createEntryDataObj(
        createAutoConfigWithHours(autoConfig, middleDates[0], "middle")
      ),
      dates: middleDates,
    };
    if (middleDatesEntryData.entryData.log.hours.total <= 0) {
      middleDatesEntryData = null;
    }
  }
  return [startDateEntryData, middleDatesEntryData, endDateEntryData];
};

export const createAutoConfigWithHours = (autoConfig, date, type) => {
  const hours = calculateHours(autoConfig, date, type).toFixed(2);
  return {
    ...autoConfig,
    hours,
  };
};
// Checks if status change should trigger the creation of time entry (true), start of time entry (false), or neither (null)
export const determineCreateLogs = (startLabels, endLabels, currentLabel) => {
  let start = null;
  startLabels.forEach((label) => {
    if (label === currentLabel.label.style.color) start = false;
    return;
  });
  if (start === false) {
    return start;
  } else {
    endLabels.forEach((label) => {
      if (label === currentLabel.label.style.color) start = true;
      return;
    });
  }
  return start;
};

export const processSchedule = async (config, itemId, creatorId) => {
  if (!validateSchedule(config)) {
    return false;
  }
  let userIds = [];
  let configArr = [];

  // Handle schedule 0 & 1
  if (config.schedule === 0 || config.schedule === 1) {
    if (config.peopleColumnId) {
      // Fetch users from people column to add to userIds. If none found we can use the creator id;
      const assignedItemUsers = await fetchUsers(
        itemId,
        config.peopleColumnId,
        creatorId
      );
      // Users found, save ids to user ids
      if (
        Array.isArray(assignedItemUsers.data) &&
        assignedItemUsers.data.length &&
        assignedItemUsers.status === 200
      ) {
        userIds = assignedItemUsers.data.map((user) => user.id) || [];
      }
    }
    // If selected to also or otherwise use rate card, perhaps for a client as well as users to track by, add this id to the user ids array
    if (config.rateCardId) {
      userIds.push(config.rateCardId);
    }
    // Check if we found any valid ids to ass, if we didn't add creator as id
    if (!userIds.length) {
      userIds = [creatorId];
    }
    configArr.push(config);
  }
  // Handle schedule 2 (using rate cards for their schedule)
  if (config.schedule === 2) {
    let usersToValidate = [];
    if (config.peopleColumnId) {
      const assignedItemUsers = await fetchUsers(
        itemId,
        config.peopleColumnId,
        creatorId
      );
      // Users found, save ids to user ids
      if (
        Array.isArray(assignedItemUsers.data) &&
        assignedItemUsers.data.length
      ) {
        // This wont be ids so need to check what comes out to get an array of ids
        usersToValidate = assignedItemUsers.data.map((user) => user.id) || [];
      }
    }
    if (config.rateCardId) {
      usersToValidate.push(config.rateCardId);
    }
    if (usersToValidate.length) {
      const rateCardRes = await findInArray(
        UsersTable,
        UsersTable.id,
        usersToValidate
      );
      if (
        rateCardRes.status !== 200 &&
        rateCardRes.data.every(
          (rateCard) => rateCard.startTime && rateCard.endTime && rateCard.days
        )
      ) {
        configArr = rateCardRes.data.map((rateCard) => ({
          ...config,
          startTime: rateCard.startTime,
          endTime: rateCard.endTime,
          currency: rateCard.currency,
          ratePerHour: rateCard.rate,
          days: rateCard.days,
        }));
      } else {
        console.error("Rate cards validation failed");
        return false;
      }
    }
  }
  userIds = userIds.map((userId) => ({ id: userId }));
  return { userIds, configArr };
};
// Helper function to determine target ID
export const determineTargetId = (item) => {
  return item.itemId || item.groupId || item.boardId;
};

export const fetchUserTimezoneOffset = async (user, creatorId) => {
  const accessKey = getCachedAccessKey(creatorId);
  if (!accessKey) {
    return { message: "Unauthorized", status: 401, data: [] };
  } else {
    monday.setToken(accessKey);
  }
  try {
    const query = `query {
      users(ids: [${user.id}]) {
        utc_hours_diff
      }
    }`;
    const res = await monday.api(query);
    if (res.data.users.length) {
      user = {
        ...user,
        timezoneOffset: res.data.users[0].utc_hours_diff,
      };
    } else {
      const fetchUserRes = await findById(UsersTable, UsersTable.id, user.id);
      if (fetchUserRes !== 200) {
        user = {
          ...user,
          timezoneOffset: 0,
        };
      } else {
        user = {
          ...user,
          timezoneOffset: fetchUserRes.data[0].timezoneOffset,
        };
      }
    }
    return user;
  } catch (error) {
    console.error(error);
    user = {
      ...user,
      timezoneOffset: 0,
    };
    return user;
  }
};

export const convertToUserTimezone = (utcDate, timezoneOffset) => {
  return new Date(utcDate.getTime() + timezoneOffset * 60 * 60 * 1000);
};

// Find the start date considering only the date part
const findStartDate = (startDate, dates, timezoneOffset) => {
  const firstDate = normalizeToMidnight(dates[0]);
  const normalizedStartDate = normalizeToMidnight(startDate);

  if (isAfter(firstDate, normalizedStartDate)) {
    // Lets see if this needs to nbe taken out or not
    return firstDate, timezoneOffset;
  }

  return startDate;
};

// Find the end date considering only the date part
const findEndDate = (endDate, dates, timezoneOffset) => {
  const lastDate = normalizeToEndOfDay(dates[dates.length - 1]);
  const normalizedEndDate = normalizeToEndOfDay(endDate);

  if (isBefore(lastDate, normalizedEndDate)) {
    // Lets see if this needs to nbe taken out or not
    returnlastDate, timezoneOffset;
  }

  return endDate;
};

const normalizeToMidnight = (date) => startOfDay(new Date(date));
const normalizeToEndOfDay = (date) => endOfDay(new Date(date));

const getTimeFloat = (date) => {
  // This date object is already in local time, so we will force it to recognise the utc time
  // ... instead to get local time and prevent conversion twice
  const hours = date.getUTCHours();
  const minutes = date.getMinutes();
  return hours + minutes / 60;
};
