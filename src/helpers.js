import { EnvironmentVariablesManager } from "@mondaycom/apps-sdk";

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

export function createDatesArr(logDetails) {
  let datesArr = [];
  if (
    new Date(logDetails.startDate).getDate() ===
    new Date(logDetails.endDate).getDate()
  ) {
    datesArr.push(logDetails.startDate);
  } else if (logDetails.custom === false) {
    datesArr = createDaysArr(
      logDetails.startDate,
      logDetails.endDate,
      logDetails.customDays || []
    );
  }
  return datesArr;
}

function createDaysArr(startDateStr, endDateStr, customDaysArr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const daysArr = [];
  for (
    const currentDate = startDate;
    currentDate <= endDate;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    if (customDaysArr && customDaysArr.length) {
      const dayOfWeek = currentDate.getDay();
      if (customDaysArr.includes(dayOfWeek)) {
        daysArr.push(currentDate.toISOString().split("T")[0]);
      }
    } else {
      if (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
        daysArr.push(new Date(currentDate).toISOString().split("T")[0]);
      }
    }
  }
  return daysArr;
}

export function calculateHours(logConfig, currentDate) {
  const endDate = new Date(logConfig.endDate).getDate();
  const date = new Date(currentDate).getDate();
  const startDate = new Date(logConfig.startDate);
  let startMinutesFraction = 0;
  let startTime = logConfig.startTime;
  if (
    date === startDate.getDate() &&
    startDate.getHours() >= logConfig.startTime
  ) {
    startTime = startDate.getHours();
    startMinutesFraction = startDate.getMinutes() / 60;
  }
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  const startTimeHours = startTime + startMinutesFraction;
  const hours =
    logConfig.schedule === 0
      ? logConfig.hours
      : logConfig.endTime - startTimeHours;
  const startMaxSum =
    logConfig.schedule === 0
      ? startTimeHours + parseFloat(logConfig.hours)
      : parseInt(logConfig.endTime);
  const currentMinuteFraction = parseFloat((currentMinutes / 60).toFixed(2));
  const diff = currentHours + currentMinuteFraction - startMaxSum;
  // if not same date, save full hours
  if (date !== endDate) {
    return parseFloat(logConfig.hours);
  } else {
    // current time is before startTime, so no hours
    if (startTimeHours > currentHours) {
      return 0;
    }
    // same hour as startTime, so only log the minutes
    if (startTime === currentHours) {
      return currentMinuteFraction - startMinutesFraction;
    }
    // Worked full hours
    if (diff > 0) {
      return parseFloat(logConfig.hours);
    }
    // worked less than full day but more than 1 hour
    if (diff <= 0) {
      return hours - Math.abs(parseFloat(diff.toFixed(2)));
    }
  }
  return 0;
}
