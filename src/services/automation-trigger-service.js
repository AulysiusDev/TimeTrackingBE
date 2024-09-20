import { AutomationConfigTable } from "../schema/schemas.js";
import { updateField } from "./crud.js";
import {
  convertToUserTimezone,
  createDatesArray,
  createUniqueHoursEntryDataObjects,
  determineCreateLogs,
  determineTargetId,
  fetchUserTimezoneOffset,
  processSchedule,
  validateDatesArray,
} from "../helpers.js";
import {
  findCreatedAtStatusChange,
  sendNotifications,
} from "./monday-service.js";
import { findAutomationConfigs } from "./advanced-crud.js";
import { fetchAndCacheAccessKey } from "../auth/oauth.js";
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

  const autoConfigRes = await fetchAndParseAutoConfigs({
    itemId,
    boardId,
    groupId,
    columnId,
  });
  if (autoConfigRes.status !== 200 || !autoConfigRes.data.length) {
    return autoConfigRes;
  }

  let autoConfigs = autoConfigRes.data;
  // Outer config as there may be more than one log config for that status column on the item, group or board, and we need to handle creating logs for all of them
  for (let outerConfig of autoConfigs) {
    const creatorId = outerConfig.userId;

    // Find and cache auth key to interact with monday api
    const fetchAndCacheAccessKeyRes = await fetchAndCacheAccessKey(creatorId);
    if (fetchAndCacheAccessKeyRes.status !== 200)
      return fetchAndCacheAccessKeyRes;

    // Find more accurate time status was changed as can be delay in the system sending req here from automation centre trigger
    const changedAtRes = await findCreatedAtStatusChange(
      boardId,
      columnId,
      itemId,
      columnValue,
      creatorId
    );
    const changedAt =
      changedAtRes.status === 200
        ? changedAtRes.data
        : new Date().toISOString();

    // Return a boolean, true if startus turned to end label, false if it turned to start label and null if neither start or end label
    const createLog = determineCreateLogs(
      outerConfig.startLabels,
      outerConfig.endLabels,
      columnValue
    );

    if (createLog === false)
      return await handleStartTracking(outerConfig, changedAt);

    if (createLog === null) return await handleUnconfiguredLabel(outerConfig);

    if (createLog === true) {
      outerConfig = {
        ...outerConfig,
        endDate: changedAt,
      };
      return await handleCreateLogs(outerConfig, itemId, creatorId);
    }
  }
  return {
    message: "Successfull creation of entry log",
    status: 200,
    data: [],
  };
}

const handleStartTracking = async (config, changedAt) => {
  // Reset autoConfig
  const response = await updateField(
    AutomationConfigTable,
    AutomationConfigTable.id,
    AutomationConfigTable.startDate,
    { startDate: changedAt },
    config.id
  );
  if (response.status === 200)
    return { message: "Automation started", status: 200, data: [] };
  else return response;
};

const handleUnconfiguredLabel = async (config) => {
  // Not sure if we should do anything here.
  // Too mnay notifications might be annoying, ask for feedback from team
  return { message: "Unrelated label change", status: 200, data: [] };
};

const handleCreateLogs = async (outerConfig, itemId, creatorId) => {
  const processedScheduleRes = await processSchedule(
    outerConfig,
    itemId,
    creatorId
  );
  if (
    !processedScheduleRes ||
    !processedScheduleRes?.userIds.length ||
    !processedScheduleRes?.configArr.length
  ) {
    return {
      message: "Auto config schedule failed to validate.",
      status: 400,
      data: outerConfig,
    };
  }

  let { userIds, configArr } = processedScheduleRes;
  // These configs are base configs, which could have different schedules
  // ... based on the possibility of multiple rate cards configured
  for (let config of configArr) {
    const validatedUsersRes = await validateAndCreateUsers({
      user: {
        ids: userIds,
        creatorId,
      },
    });
    console.dir({ validatedUsersRes }, { depth: null });
    if (validatedUsersRes.status === 500 || validatedUsersRes.status === 400) {
      return { status: validatedUsersRes.status, ...validatedUsersRes };
    }

    // let testStartDate = new Date(Date.UTC(2024, 8, 5)); // 9th September 2024 11am
    // const testSDWithHours = new Date(testStartDate.setUTCHours(22, 30, 0, 0));
    // let testEndDate = new Date(Date.UTC(2024, 8, 12)); // 11th September 2024 3pm
    // const testEDWithHours = new Date(testEndDate.setUTCHours(6, 15, 0, 0));
    for (let user of userIds) {
      config = {
        ...config,
        userIds: [user],
      };
      const userWithTimezoneOffset = await fetchUserTimezoneOffset(
        user,
        creatorId
      );
      config = {
        ...config,
        userIds: [userWithTimezoneOffset],
      };
      user = userWithTimezoneOffset;
      const localStartDate = convertToUserTimezone(
        new Date(config.startDate),
        // testSDWithHours,
        user.timezoneOffset
      );
      const localEndDate = convertToUserTimezone(
        new Date(config.endDate),
        // testEDWithHours,
        user.timezoneOffset
      );

      config = {
        ...config,
        startDate: localStartDate,
        endDate: localEndDate,
      };

      // In case multi day is true
      const dates = createDatesArray(
        localStartDate,
        localEndDate,
        config.custom ? config.customDays : [1, 2, 3, 4, 5]
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
      const entryDataObjectArray = createUniqueHoursEntryDataObjects(
        config,
        dates
      );
      // console.dir({ entryDataObjectArray }, { depth: null });
      let logs = {
        created: { count: 0, target: null },
        errored: { count: 0, target: null },
      };
      for (const entryDataObj of entryDataObjectArray) {
        if (!entryDataObj) {
          continue;
        }
        // Validate and create logs
        const { entryData, dates } = entryDataObj;
        const validateCreateRes = await validateAndCreateLogs(entryData, dates);
        const targetId = determineTargetId(entryData.item);
        if (validateCreateRes.status !== 201) {
          logs.errored.count += 1;
          logs.errored.target = targetId;
        } else {
          logs.created.count += validateCreateRes.data.length;
          logs.created.target = targetId;
        }
      }
      // I want to make notifications optionally email or monday notifications
      // For now just monday
      await sendNotifications(
        config.userIds,
        creatorId,
        logs.created.target,
        `${logs.created.count} logs were successfully created.`
      );
      await sendNotifications(
        config.userId,
        creatorId,
        logs.errored.target,
        `${logs.errored.count} errors creating logs.`
      );
    }
  }
  const response = await updateField(
    AutomationConfigTable,
    AutomationConfigTable.id,
    AutomationConfigTable.startDate,
    { startDate: null },
    configArr[0].id
  );
  if (response.status !== 200) {
    await sendNotifications(
      creatorId,
      creatorId,
      log.created.target,
      `Error resetting automation config`
    );
  }
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

const fetchAndParseAutoConfigs = async (params) => {
  const { status, message, data } = await findAutomationConfigs({
    ...params,
  });
  const autoConfigs = [];
  if (status !== 200) {
    return { status, message, data };
  } else {
    data.forEach((autoConfig) => {
      autoConfigs.push({
        ...autoConfig,
        startLabels: JSON.parse(autoConfig.startLabels),
        endLabels: JSON.parse(autoConfig.endLabels),
        customDays: JSON.parse(autoConfig.customDays),
      });
    });
  }
  return { message: "Success", status: 200, data: autoConfigs };
};
