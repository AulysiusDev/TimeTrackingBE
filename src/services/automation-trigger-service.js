import { AutomationConfigTable, UsersTable } from "../schema/schemas.js";
import { findInArray, updateField } from "./crud.js";
import {
  calculateHours,
  createDatesArray,
  createEntryDataObj,
  validateDatesArray,
} from "../helpers.js";
import {
  fetchUsers,
  findCreatedAtStatusChange,
  sendNotifications,
} from "./monday-service.js";
import { findAutomationConfigs } from "./advanced-crud.js";
import { fetchAccessKey } from "../auth/oauth.js";
import { cacheAccessKey } from "../auth/cache.js";
import {
  validateAndCreateLogs,
  validateAndCreateUsers,
} from "./create-entries-service.js";

export async function handleAutomationTriggerService(payload) {
  const {
    groupId,
    // previousColumnValue,
    columnValue,
    boardId,
    itemId,
    columnId,
  } = payload.inboundFieldValues;
  // Fetch Automation config from postgres db, it may be for sepcific item, group or entrie board
  const { status, message, data } = await findAutomationConfigs({
    itemId,
    boardId,
    groupId,
    columnId,
  });
  if (status !== 200) {
    return { status, message, data };
  }
  // Will put this in a for loop to do for each config if there are multiple, however, for now not to configure easily
  let autoConfig = {
    ...data[0],
    startLabels: JSON.parse(data[0].startLabels),
    endLabels: JSON.parse(data[0].endLabels),
    customDays: JSON.parse(data[0].customDays),
  };

  const userId = autoConfig.userId;

  // find and cache auth key to interact with monday api
  const fetchAccessKeyRes = await fetchAccessKey(userId);
  if (!fetchAccessKeyRes || fetchAccessKeyRes.status !== 200) {
    return fetchAccessKeyRes;
  } else {
    cacheAccessKey(userId, fetchAccessKeyRes.data);
  }

  // Find more accurate time status was changed as can be delay in the system sending req here from automation centre trigger
  const changedAtRes = await findCreatedAtStatusChange(
    boardId,
    columnId,
    itemId,
    columnValue,
    userId
  );
  // Return a boolean, true if startus turned to end label, false if it turned to start label and null if neither start or end label
  const createLog = startOrComplete(
    autoConfig.startLabels,
    autoConfig.endLabels,
    columnValue
  );
  console.log({ createLog });
  // Start log
  if (createLog === false) {
    // Reset autoConfig
    const response = await updateField(
      AutomationConfigTable,
      AutomationConfigTable.id,
      AutomationConfigTable.startDate,
      { startDate: new Date(changedAtRes.data) || new Date() },
      autoConfig.id
    );
    console.dir({ response }, { depth: null });
    return { message: "Automation started", status: 200, data: [] };
  }
  // Neither start or stop
  if (createLog === null) {
    // Handle other label, maybe do nothing
    return;
  }

  // Create log

  // No valid schedule
  if (
    autoConfig.schedule !== 0 ||
    autoConfig.schedule !== 1 ||
    autoConfig.schedule !== 2
  ) {
    // No valid schedule set
  }
  let autoConfigsArr = [];
  let userIds = [];
  // Schedule 0 & 1 validation, getting correct userIds array
  if (
    (autoConfig.schedule === 0 && validateScheduleZero(autoConfig)) ||
    (autoConfig.schedule === 1 && validateScheduleOne(autoConfig))
  ) {
    if (autoConfig.peopleColumnId) {
      // Fetch users from people column to add to userIds. If none found we can use the creator id;
      const assignedItemUsers = await fetchUsers(
        itemId,
        autoConfig.peopleColumnId,
        userId
      );
      console.dir({ assignedItemUsers }, { depth: null });
      // Users found, save ids to user ids
      if (
        Array.isArray(assignedItemUsers.data) &&
        assignedItemUsers.data.length
      ) {
        userIds = assignedItemUsers.data.map((user) => user.id);
      }
    }
    // If selected to also or otherwise use rate card, perhaps for a client as well as users to track by, add this id to the user ids array
    if (autoConfig.rateCardId) {
      userIds = [...userIds, rateCardId];
    }
    // Check if we found any valid ids to ass, if we didn't add creator as id
    if (!userIds.length) {
      console.log("No users");
      userIds = [autoConfig.userId];
    }
  }
  console.log({ userIds });

  if (autoConfig.schedule === 2 && validateScheduleTwo) {
    let usersToValidate = [];
    if (autoConfig.peopleColumnId) {
      const assignedItemUsers = await fetchUsers(
        itemId,
        autoConfig.peopleColumnId,
        userId
      );
      // Users found, save ids to user ids
      if (
        Array.isArray(assignedItemUsers.data) &&
        assignedItemUsers.data.length
      ) {
        // This wont be ids so need to check what comes out to get an array of ids
        console.dir({ assignedItemUsers }, { depth: null });
        usersToValidate = [...assignedItemUsers.data];
      }
    }
    if (autoConfig.rateCardId) {
      usersToValidate = [...usersToValidate, autoConfig.rateCardId];
    }
    if (usersToValidate.length) {
      // Find rate cards and ensure they all have the correct details
      const rateCardRes = await findInArray(
        UsersTable,
        UsersTable.id,
        usersToValidate
      );
      if (rateCardRes.status !== 200) {
        return rateCardRes;
        // All rate cards have been validated
      } else if (
        rateCardRes.data.every(
          (rateCard) => rateCard.startTime && rateCard.endTime && rateCard.days
        )
      ) {
        rateCardRes.data.forEach((rateCard) =>
          autoConfigsArr.push({
            ...autoConfig,
            startTime: rateCard.startTime,
            endTime: rateCard.endTime,
            currency: rateCard.currency,
            ratePerHour: rateCard.rate,
            days: rateCard.days,
          })
        );
      } else {
        // couldn't validate rate cards
        return;
      }
    }
  }
  if (!userIds.length) {
    // Invalid params
  }

  // Validate and create users
  if (userIds.length) {
    const userIdsToValidateArray = userIds.map((userId) => {
      return { id: userId };
    });
    const validatedUsersRes = await validateAndCreateUsers({
      user: {
        ids: userIdsToValidateArray,
        creatorId: autoConfig.userId,
      },
    });
    console.dir({ validatedUsersRes }, { depth: null });
    autoConfig = {
      ...autoConfig,
      userIds: validatedUsersRes.data.map((user) => ({ id: user.id })),
    };
    if (validatedUsersRes.status === 500 || validatedUsersRes.status === 400) {
      return { status: validatedUsersRes.status, ...validatedUsersRes };
    }
  }
  // Create users
  const endDate = changedAtRes.data ? new Date(changedAtRes.data) : new Date();
  autoConfig = {
    ...autoConfig,
    endDate: endDate,
  };
  // In case multi day is true
  const dates = createDatesArray(
    // autoConfig.startDate,
    new Date(2024, 7, 29),
    endDate,
    autoConfig.custom ? autoConfig.customDays : [1, 2, 3, 4, 5]
  );
  // Date array validation
  if (!validateDatesArray(dates)) {
    return {
      status: 500,
      message:
        "There was an error creating valid dates on which to create logs.",
      data: [],
    };
  }

  // Create entryData objects with dates to validate and create logs with
  const entryDataObjectArray = createUniqueHoursEntryDataObjects(
    autoConfig,
    dates
  );
  let createdLogs = {
    count: 0,
    target: null,
  };
  let erroredLogs = {
    count: 0,
    target: null,
  };
  // Create logs
  for (const entryDataObj of entryDataObjectArray) {
    if (!entryDataObj) {
      continue;
    }
    const validateAndCreateLogsRes = await validateAndCreateLogs(
      entryDataObj.entryData,
      entryDataObj.dates
    );
    console.dir({ validateAndCreateLogsRes }, { depth: null });
    if (validateAndCreateLogsRes.status !== 201) {
      erroredLogs = {
        ...erroredLogs,
        target: entryDataObj.entryData.item.itemId
          ? entryDataObj.entryData.item.itemId
          : entryDataObj.entryData.item.groupId
          ? entryDataObj.entryData.item.groupId
          : entryDataObj.entryData.item.boardId,

        count: (erroredLogs.count += 1),
      };
    } else {
      console.log({ length: validateAndCreateLogsRes.data.length });
      createdLogs = {
        ...createdLogs,
        count: (createdLogs.count += validateAndCreateLogsRes.data.length),
        target: entryDataObj.entryData.item.itemId
          ? entryDataObj.entryData.item.itemId
          : entryDataObj.entryData.item.groupId
          ? entryDataObj.entryData.item.groupId
          : entryDataObj.entryData.item.boardId,
      };
    }
  }

  const successMessage = `${createdLogs.count} time logs were created for you.`;
  const successNotificationsRes = await sendNotifications(
    autoConfig.userIds,
    autoConfig.userId,
    createdLogs.target,
    successMessage
  );
  const errorMessage = `Error creating ${erroredLogs.count} time logs created for you.`;
  const errorNotificationsRes = await sendNotifications(
    autoConfig.userIds,
    autoConfig.userId,
    erroredLogs.target,
    errorMessage
  );

  // Reset autoConfig
  const response = await updateField(
    AutomationConfigTable,
    AutomationConfigTable.id,
    AutomationConfigTable.startDate,
    { startDate: null },
    autoConfig.id
  );
  // Alert to error resetting autoConfig
  if (response.status !== 200) {
    const notificationText = `There was an error updating the automation config.`;
    await sendNotifications(data.userId, itemId, notificationText);
    return {
      message: response.message || "Unknown error updating automation config.",
      status: response.status || 500,
      data: response.data || [],
    };
  }
  return {
    status: 200,
    data: [],
    message: "Successfull creation of entry log",
  };
}
// Checks if status change should trigger the creation of time entry (true), start of time entry (false), or neither (null)
const startOrComplete = (startLabels, endLabels, currentLabel) => {
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

const handleStartOrNullNotifcations = async (
  createLog,
  userIds,
  itemId,
  startDate,
  autoConfigId
) => {
  if (createLog === false) {
    const updateRes = await updateField(
      AutomationConfigTable,
      AutomationConfigTable.id,
      AutomationConfigTable.startDate,
      { startDate: new Date() },
      autoConfigId
    );
    const notificationText = `A new time tracking log has been opened for you on item-${itemId}. To end the tracking and create the log, change the status to match the specified "End label".`;
    await sendNotifications(userIds, itemId, notificationText);
  }
  // If label changed to unrelated label but time tracking start date has been set
  if (createLog === null && startDate !== null) {
    const notificationText = `Item-${itemId}'s status has changed to neither a start or end label. This item is still tracking time, please be aware this automation is still active and tracking!`;
    await sendNotifications(userIds, itemId, notificationText);
  }
};

const createUniqueHoursEntryDataObjects = (autoConfig, datesArray) => {
  let startDateEntryData = null;
  let middleDatesEntryData = null;
  let endDateEntryData = null;
  if (!Array.isArray(datesArray) || !datesArray.length) {
    return [startDateEntryData, middleDatesEntryData, endDateEntryData];
  }
  let dates = [...datesArray];
  const totalDates = dates.length;
  // Start date
  if (totalDates >= 1) {
    startDateEntryData = {
      entryData: createEntryDataObj(
        createAutoConfigWithHours(autoConfig, dates[0])
      ),
      dates: [dates[0]],
    };
  }
  // end date
  if (totalDates >= 2) {
    endDateEntryData = {
      entryData: createEntryDataObj(
        createAutoConfigWithHours(autoConfig, dates[dates.length - 1])
      ),
      dates: [dates[dates.length - 1]],
    };
  }
  // Middle dates
  if (totalDates > 2) {
    const middleDates = dates.slice(1, totalDates - 1);
    middleDatesEntryData = {
      entryData: createEntryDataObj(
        createAutoConfigWithHours(autoConfig, middleDates[0])
      ),
      dates: middleDates,
    };
  }
  return [startDateEntryData, middleDatesEntryData, endDateEntryData];
};

const createAutoConfigWithHours = (autoConfig, date) => {
  const hours = calculateHours(autoConfig, date).toFixed(2);
  return {
    ...autoConfig,
    hours,
  };
};

const validateScheduleZero = (autoConfig) => {
  return autoConfig.startTime && autoConfig.hours;
};

const validateScheduleOne = (autoConfig) => {
  return (
    autoConfig.startTime &&
    autoConfig.endTime &&
    ((autoConfig.custom && autoConfig.customDays.length) || !autoConfig.custom)
  );
};
const validateScheduleTwo = (autoConfig) => {
  return autoConfig.peopleColumnId || autoConfig.rateCardId;
};
