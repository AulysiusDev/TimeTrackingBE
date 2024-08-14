import { EnvironmentVariablesManager } from "@mondaycom/apps-sdk";
import jwt from "jsonwebtoken";

const secretManager = new EnvironmentVariablesManager();
const DEVELOPMENT_ENV = "development";
const NODE_ENV = "NODE_ENV";

export const isDevelopmentEnv = () => {
  const currentEnv = (getSecret(NODE_ENV) || DEVELOPMENT_ENV).toLowerCase();
  return currentEnv === "development";
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
    console.log("same day");
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

export function calculateHours(logConfig, current) {
  console.log({ logConfig });
  const currentDate = new Date(current);
  const endDate = new Date(logConfig.endDate);
  const startDate = new Date(logConfig.startDate);

  let startTime = Math.max(
    startDate.getUTCHours() + startDate.getUTCMinutes() / 60,
    logConfig.startTime
  );
  let endTime = endDate.getUTCHours() + endDate.getUTCMinutes() / 60;
  let maxHours =
    logConfig.schedule === 1
      ? logConfig.endTime - logConfig.startTime
      : parseFloat(logConfig.hours);

  if (
    endDate.getUTCDate() === startDate.getUTCDate() &&
    startDate.getUTCDate() === currentDate.getUTCDate()
  ) {
    console.log("Same day");
    if (logConfig.schedule === 1) {
      endTime = Math.min(logConfig.endTime, endTime);
    }
    console.log({ startTime });
    console.log({ endTime });
    console.log({ startMinusEnd: endTime - startTime });
    console.log(Math.min(maxHours, endTime - startTime));
    return parseFloat(Math.min(maxHours, endTime - startTime).toFixed(2));
  }

  if (startDate.getUTCDate() === currentDate.getUTCDate()) {
    console.log("Start day");
    return parseFloat(
      logConfig.endTime
        ? Math.min(maxHours, logConfig.endTime - startTime)
        : Math.min(maxHours, 24 - startTime).toFixed(2)
    );
  }

  if (endDate.getUTCDate() === currentDate.getUTCDate()) {
    console.log("End day");
    startTime = logConfig.startTime;
    endTime =
      logConfig.schedule === 1 ? Math.min(logConfig.endTime, endTime) : endTime;
    return parseFloat(Math.min(endTime - startTime, maxHours).toFixed(2));
  }
  return parseFloat(maxHours.toFixed(2));
}
