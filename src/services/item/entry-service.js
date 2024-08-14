import {
  validateItem,
  validateLog,
  validateUser,
} from "../../db/validators.js";
import { createDatesArray, validateDatesArray } from "../../helpers.js";
import schemas from "../../schema/schemas.js";
import { createEntry, findById, findInArray, updateField } from "../crud.js";
import { findUsernames, sendNotifications } from "../monday-service.js";

export async function createTimeEntryService(entryData) {
  console.dir({ entryData }, { depth: null });
  if (!entryData?.sessionToken) {
    return {
      message:
        "No session token present in this request for authorization. Please reload the app and contact developers if this error persists.",
      status: 403,
      data: [],
    };
  }
  // Validate user objects and create them in db if not already, this is so rate crads can be created etc.
  const validatedUsers = await validateAndCreateUsers(entryData);
  if (validatedUsers.status === 500 || validatedUsers.status === 400) {
    return { status: validatedUsers.status, ...validatedUsers };
  }
  // Find creators access key, or use oAuth if not provided yet
  const creatorRes = await findById(
    schemas.UsersTable,
    schemas.UsersTable.id,
    entryData.user.creatorId
  );
  if (creatorRes.status !== 200) {
    return { message: creatorRes.message, data: creatorRes.data };
  }
  const accessKey = creatorRes.data[0]?.accessKey;
  if (!accessKey) {
    // Send to oAuth
  }

  const updateWithAccessTokenRes = await updateField(
    schemas.UsersTable,
    schemas.UsersTable.id,
    schemas.UsersTable.accessKey,
    { accessKey: accessKey },
    entryData.user.creatorId
  );

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
  if (createLogsRes.status === 500) {
    return {
      status: 500,
      message: createLogsRes.message,
      data: createLogsRes.data,
    };
  }

  // Send notifications to creator id
  const target = entryData.item.id
    ? entryData.item.id
    : entryData.groupId
    ? entryData.groupId
    : entryData.boardId
    ? entryData.boardId
    : entryData.workspaceId;

  const dateString =
    new Date(entryData.log.date).getDate() ===
    new Date(entryData.log.endDate).getDate()
      ? `on ${new Date(entryData.log.date).getDate()}`
      : `from ${new Date(entryData.log.date).getDate()} to ${new Date(
          entryData.log.endDate
        ).getDate()}`;

  // WHY IS THIS HERE?!
  const usernamesRes = await findUsernames(entryData.user.creatorId);

  // Send notification informing user of time log creation
  if (createLogsRes.data.length > 0) {
    const message = `${createLogsRes.data.length} time logs were created for you ${dateString}, by ${entryData.user.creatorId} `;
    await sendNotifications(entryData.user.ids, target, message);
  }

  return {
    status: 201,
    message: createLogsRes.message,
    data: createLogsRes.data,
  };
}

export async function validateAndCreateUsers(entryData) {
  // Create array of ids for validation
  const userIds = entryData.user.ids.map((user) => user.id) || [];
  if (!userIds.length) {
    return { message: "No users to validate.", status: 400, data: [] };
  }

  // Add creator to users if not already
  if (
    userIds.every(
      (userId) => parseInt(userId) !== parseInt(entryData.user.creatorId)
    )
  ) {
    userIds.push(entryData.user.creatorId);
  }
  let validatedUsers = [];
  // Create and validate user objects
  if (userIds.length) {
    for (const userId of userIds) {
      const userObj = {
        id: parseInt(userId),
        ratePerHour: null,
        startTime: null,
        endTime: null,
        currency: null,
        days: null,
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
          schemas.UsersTable,
          schemas.UsersTable.id,
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
          const res = await createEntry(schemas.UsersTable, usersToCreate);
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
      return;
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
    const newLogEntries = await createEntry(schemas.LogsTable, validatedLogs);
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
      const logObj = {
        userId: parseInt(userId.id),
        itemId: parseFloat(entryData.item.id) || null,
        boardId: parseFloat(entryData.item.boardId) || null,
        groupId: parseFloat(entryData.item.groupId) || null,
        workspaceId: parseFloat(entryData.item.workspaceId) || null,
        // Need to figure this part out, would be nice to have to reference but not urgent - targetName
        targetName: JSON.stringify(entryData.item.targeName) || null,
        date: new Date(date),
        totalHours: parseFloat(entryData.log.hours.total),
        billableHours: parseFloat(entryData.log.hours.billable),
        note: entryData.log.note || "",
        ratePerHour: parseFloat(entryData.rateCard.rate) || null,
        currency: JSON.stringify(entryData.rateCard.currency?.value) || null,
        status: parseInt(0),
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
    checkItemExists = await findById(
      schemas.ItemsTable,
      schemas.ItemsTable.id,
      id
    );
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
    const newItem = await createEntry(schemas.ItemsTable, data);
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
