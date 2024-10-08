import { fetchAccessKey } from "../auth/oauth.js";
import { validateItem, validateLog, validateUser } from "../db/validators.js";
import {
  createDatesArray,
  createUniqueIdsArr,
  validateDatesArray,
} from "../helpers.js";
import { createEntries, findById, findInArray } from "./crud.js";
import { sendNotifications } from "./monday-service.js";
import { cacheAccessKey } from "../auth/cache.js";
import { LogsTable, UsersTable } from "../schema/schemas.js";
import { addUsernamesWithPhotoThumbs } from "./fetch-entries-service.js";

// Root function, creates time logs from input data, across a period and for multiple users if selected
export async function createTimeEntriesService(entryData) {
  console.dir({ entryData }, { depth: null });
  // Validate user objects and create them in db if not already, this is so rate crads can be created etc.
  const validatedUsersRes = await validateAndCreateUsers(entryData);
  if (validatedUsersRes.status === 500 || validatedUsersRes.status === 400) {
    return { status: validatedUsersRes.status, ...validatedUsersRes };
  }
  const accessKeyRes = await fetchAccessKey(entryData.user.creatorId);
  if (accessKeyRes.status === 401 || !accessKeyRes) {
    return accessKeyRes;
  } else if (accessKeyRes.status === 200) {
    cacheAccessKey(entryData.user.creatorId, accessKeyRes.data);
  }

  // custom days or monday to friday (1-5 index)
  const daysArr = entryData.schedule.custom
    ? entryData.schedule.days
    : [1, 2, 3, 4, 5];
  if (
    Array.isArray(daysArr) &&
    !daysArr.length &&
    entryData.schedule.multiDay
  ) {
    return {
      status: 400,
      message:
        "There were no days provided to make logs on multiple days. Please ensure days are selcted on which to make logs.",
      data: [],
    };
  }

  // In case multi day is true
  const dates = createDatesArray(
    entryData.log.date,
    entryData.log.endDate,
    daysArr
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
  const createLogsRes = await validateAndCreateLogs(entryData, dates);
  // Return error for user if error
  if (createLogsRes.status !== 201) {
    return createLogsRes;
  }
  console.dir({ createLogsRes }, { depth: null });

  // Send notifications to creator id
  let target = entryData.item.id
    ? entryData.item.id
    : entryData.groupId
    ? entryData.groupId
    : entryData.boardId
    ? entryData.boardId
    : entryData.workspaceId;

  target = typeof target === "string" ? target : JSON.stringify(target);
  const dateString =
    new Date(entryData.log.date).getDate() ===
    new Date(entryData.log.endDate).getDate()
      ? `on ${new Date(entryData.log.date).getDate()}`
      : `from ${new Date(entryData.log.date).getDate()} to ${new Date(
          entryData.log.endDate
        ).getDate()}`;

  const logsWithUsernamesPhotoThumbsRes = await addUsernamesWithPhotoThumbs(
    createUniqueIdsArr(createLogsRes.data),
    createLogsRes.data,
    entryData.user.creatorId
  );
  const creatorUsername =
    logsWithUsernamesPhotoThumbsRes.status === 200
      ? logsWithUsernamesPhotoThumbsRes?.data?.data?.users[0]?.name
      : `a user with this id: ${entryData.user.creatorId}`;

  // Send notification informing user of time log creation
  if (createLogsRes.data.length > 0) {
    const message = `${createLogsRes.data.length} time logs were created for you ${dateString}, by ${creatorUsername}.`;
    const notificationsRes = await sendNotifications(
      entryData.user.ids,
      entryData.user.creatorId,
      target,
      message
    );

    if (notificationsRes.status !== 200) {
      const errorMessage = `There was an error creating  notifications for successful logs. Status: ${notificationsRes.status}; Message: ${notificationsRes.message}.`;
      const errorNotificationRes = await sendNotifications(
        entryData.user.creatorId,
        entryData.user.creatorId,
        target,
        errorMessage
      );
      if (errorNotificationRes.status !== 200) {
        return errorNotificationRes;
      }
    }
  }

  return {
    status: 201,
    message: logsWithUsernamesPhotoThumbsRes.message,
    data: logsWithUsernamesPhotoThumbsRes.data,
  };
}

export async function validateAndCreateUsers(entryData) {
  // Create array of ids for validation
  let userIds =
    entryData.user.ids?.map((user) => ({ id: parseInt(user.id) })) || [];
  if (!userIds.some((user) => user.id === entryData.user.creatorId)) {
    userIds.push({ id: entryData.user.creatorId });
  }
  if (!userIds.length) {
    return { message: "No users to validate.", status: 400, data: [] };
  }
  let validatedUsers = [];
  // Create and validate user objects
  if (userIds.length) {
    for (const userId of userIds) {
      const userObj = {
        id: userId.id,
        name: null,
      };
      // Validate user objects
      const { data, hasError, message } = await validateUser(userObj);
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
      validatedUsers.push(data);
    }
    if (validatedUsers.length) {
      try {
        // Find users who are in db - UsersTable
        const users = await findInArray(
          UsersTable,
          UsersTable.id,
          validatedUsers.map((userObj) => userObj.id)
        );
        let usersToCreate = [];
        // No user ids provided
        if (users.status === 400) {
          return { message: "No users to validate.", status: 400, data: [] };
        }
        // Create all users as none in db - UsersTable
        if (users.status === 404) {
          usersToCreate = validatedUsers;
          // Found some users, need to create all users not found
        } else if (users.status === 200) {
          const userIds = users.data.map((user) => user.id);
          usersToCreate = validatedUsers.filter(
            (user) => !userIds.includes(user.id)
          );
        }
        // Create users which are not present in db - UsersTable
        if (usersToCreate.length) {
          const res = await createEntries(UsersTable, usersToCreate);
          if (res.status === 500) {
            return {
              message: "There was an error creating user entries",
              status: 500,
              data: res,
            };
          }
        }
        // Catch errors
      } catch (error) {
        console.error(error);
        return {
          message: "Error finding user in database.",
          status: 500,
          data: error,
        };
      }
      // Return validated users
      return {
        message: "All users found and validated.",
        data: validatedUsers,
        status: 200,
      };
    } else {
      // If no user ids provided
      return { message: "No users to validate.", status: 400, data: [] };
    }
  }
}

export async function validateAndCreateLogs(entryData, dates) {
  let validatedLogs = [];
  const logsArray = createLogsArray(entryData, dates);
  // Validate all logs
  for (const log of logsArray) {
    const { data, hasError, message } = await validateLog(log);
    if (hasError === true || hasError === undefined) {
      console.error(message || hasError);
      return { message: message, status: 500, data: data };
    }
    validatedLogs.push(data);
  }

  // Find unvalidated logs and communicate this with creator, from creator id
  const unvalidatedLogs =
    logsArray.filter(
      (log) =>
        !validatedLogs.some(
          (vLog) =>
            new Date(vLog.date).getTime() === new Date(log.date).getTime() &&
            vLog.userId === log.userId
        )
    ) || [];

  try {
    // Create entries in db
    const newLogEntries = await createEntries(LogsTable, validatedLogs);
    return newLogEntries;
  } catch (error) {
    console.error(error);
    return {
      message: error?.message || "Error creating log/s.",
      data: error,
      status: error?.status || 500,
    };
  }
}

// Create array of all logs for each date and each user id., with valid types and structure
export const createLogsArray = (entryData, dates) => {
  const logsArray = entryData.user.ids.flatMap((userId) =>
    dates.map((date) => {
      const middayDate = new Date(date);
      middayDate.setHours(12, 0, 0, 0);
      const logObj = {
        userId: parseInt(userId.id),
        itemId:
          typeof entryData.item.id === "string"
            ? entryData.item.id
            : JSON.stringify(entryData.item.id) || null,
        subitemId:
          entryData.item.subitemId === "null" ||
          entryData.item.subitemId === null ||
          !entryData.item.subitemId
            ? null
            : entryData.item.subitemId,
        boardId:
          typeof entryData.item.boardId === "string"
            ? entryData.item.boardId
            : JSON.stringify(entryData.item.boardId) || null,
        groupId:
          typeof entryData.item.groupId === "string"
            ? entryData.item.groupId
            : JSON.stringify(entryData.item.groupId) || null,
        workspaceId:
          typeof entryData.item.workspaceId === "string"
            ? entryData.item.workspaceId
            : JSON.stringify(entryData.item.workspaceId) || null,
        // Need to figure this part out, would be nice to have to reference but not urgent - targetName
        targetName: entryData.item.targeName || null,
        date: middayDate,
        totalHours: parseFloat(entryData.log.hours.total),
        billableHours: parseFloat(entryData.log.hours.billable),
        note: entryData.log.note || "",
        ratePerHour: parseFloat(entryData.rateCard.rate) || null,
        currency: entryData.rateCard.currency?.value || null,
        status: 0,
      };
      return logObj;
    })
  );
  return logsArray;
};

export async function validateAndCreateItem(entryData) {
  // Create item obj from entryData
  const isSubitem = entryData.item.subitemId !== null;
  let itemObj = {
    id: isSubitem ? entryData.item.subitemId : entryData.item.id,
    isSubitem: isSubitem,
    parentItemId: isSubitem ? entryData.item.id : null,
    boardId: entryData.item.boardId,
    workspaceId: entryData.item.workspaceId,
  };

  //   Check if entry already exists
  let checkItemExists;
  let errorMessage = `${isSubitem ? "Subitem" : "Item"} entry already exists`;
  let itemExists = false;
  try {
    checkItemExists = await findById(ItemsTable, ItemsTable.id, id);
  } catch (error) {
    return { message: errorMessage, data: error, status: 500 };
  }
  if (checkItemExists.status === 200) {
    itemExists = true;
  }

  // Validate item data
  const { data, hasError, message } = await validateItem(itemObj);
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
  if (itemExists) {
    return {
      message: "Item aleady exists and data has been validated.",
      data: data,
      status: 200,
    };
  }
  // Create entry in ItemsTable
  try {
    const newItem = await createEntries(ItemsTable, data);
    return {
      message: "New item entry created and data validated.",
      data: newItem.data,
      status: 201,
    };
  } catch (error) {
    console.error(error);
    return {
      message: message ? message : "Error creating item entry.",
      data: error,
      status: 500,
    };
  }
}
