import { EnvironmentVariablesManager } from "@mondaycom/apps-sdk";
import jwt from "jsonwebtoken";

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
  // Same day
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (
    !end ||
    !validateDatesArray([new Date(end)]) ||
    startDate.getDate() === endDate.getDate()
  ) {
    return [startDate];
  }
  // Multi day
  if (!days.length) {
    return [];
  }
  const datesArr = [];
  for (
    const currentDate = startDate;
    currentDate <= endDate;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    if (days && days.length) {
      const dayOfWeek = currentDate.getDay();
      if (days.includes(dayOfWeek)) {
        datesArr.push(currentDate.toISOString().split("T")[0]);
      }
    } else {
      if (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
        datesArr.push(new Date(currentDate).toISOString().split("T")[0]);
      }
    }
  }
  if (days.includes(new Date(endDate).getDay())) {
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

export function calculateHours(autoConfig, current) {
  // Create date objects
  const currentDate = new Date(current);
  const endDate = new Date(autoConfig.endDate);
  const startDate = new Date(2024, 7, 29);

  // Get start & end time as floats
  // Calculate if start time was greater than the set start time.
  let startTime = Math.max(
    startDate.getUTCHours() + startDate.getUTCMinutes() / 60,
    autoConfig.startTime
  );
  let endTime = endDate.getUTCHours() + endDate.getUTCMinutes() / 60;

  // maximum hours a user is set to work in a day, either the set max hours, or the difference between start and end times
  let maxHours =
    autoConfig.schedule === 1 || autoConfig.schedule === 2
      ? autoConfig.endTime - autoConfig.startTime
      : parseFloat(autoConfig.hours);

  // Just one day, started and stopped on the same day.
  if (
    endDate.getUTCDate() === startDate.getUTCDate() &&
    startDate.getUTCDate() === currentDate.getUTCDate()
  ) {
    // Work schedule option
    if (autoConfig.schedule === 1 || autoConfig.schedule === 2) {
      // Because the scheduled end time may be later than the time they actually ended it
      endTime = Math.min(autoConfig.endTime, endTime);
    }
    return parseFloat(Math.min(maxHours, endTime - startTime).toFixed(2));
  }

  // Caluclate start date, but there is more than 1 day
  if (startDate.getUTCDate() === currentDate.getUTCDate()) {
    return parseFloat(
      // Calculate difference between start and end time
      // Or if they selected max hours per day, see if the user stopped automation before max hours is reached,
      // ...in which case return the smaller number as they didn't work the max hours that day
      autoConfig.endTime &&
        (autoConfig.schedule === 1 || autoConfig.schedule === 2)
        ? Math.min(maxHours, autoConfig.endTime - startTime)
        : Math.min(maxHours, 24 - startTime).toFixed(2)
    );
  }
  // Calculate end date
  if (endDate.getUTCDate() === currentDate.getUTCDate()) {
    // if schedule is not max hours per day, return end time as either the scheduled end time,
    // ...or if they stopped it earlier, return this earlier time
    endTime =
      autoConfig.schedule === 1 || autoConfig.schedule === 2
        ? Math.min(autoConfig.endTime, endTime)
        : // Max hours per day selected, use calcuated end time which doesn't exceed max hours
          endTime;
    // Return the smaller of the calculations to ensure we return the value which does not exceed limits(end time scheduled or max hours)
    return parseFloat(
      Math.min(endTime - autoConfig.startTime, maxHours).toFixed(2)
    );
  }
  // It is a middle day, so we just return max hours as automation has been running all of this day
  return parseFloat(maxHours.toFixed(2));
}
export const safeJsonParse = (str, fallback) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

export const createEntryDataObj = (autoConfig) => {
  console.dir({ autoConfig }, { depth: null });
  return {
    user: {
      ids:
        // Here, if there are no user ids, so no rate card id etc, then we must use the creator id instead to log against
        Array.isArray(autoConfig.userIds) && autoConfig.userIds.length
          ? [...autoConfig.userIds]
          : [autoConfig.userId],
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
      id: autoConfig.rateCardId,
      currency: autoConfig.currency,
      rate: autoConfig.rate,
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
      note: autoConfig.note,
      date: autoConfig.date,
      endDate: "",
      category: autoConfig.category,
      hours: {
        total: autoConfig.hours,
        billable: autoConfig.category === "NB" ? 0 : autoConfig.hours,
      },
    },
  };
};
