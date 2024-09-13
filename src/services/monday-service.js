import initMondayClient from "monday-sdk-js";
import { getCachedAccessKey } from "../auth/cache.js";
const monday = initMondayClient();

// Send a notification to a user. (target is the id of the thing updating about)
export async function sendNotifications(userIds, creatorId, target, text) {
  // Validate inputs
  if (!target || !text) {
    return { message: "Invalid inputs.", status: 400, data: [] };
  }
  if (!creatorId) {
    return { message: "Unauthorized.", status: 401, data: [] };
  }
  if (!Array.isArray(userIds)) {
    userIds = [userIds];
  }
  if (Array.isArray(userIds) && userIds.length < 1) {
    return {
      message: "No user ids provided to send notifications to.",
      status: 400,
      data: [],
    };
  }
  try {
    const accessKey = getCachedAccessKey(creatorId);
    if (!accessKey) {
      return { message: "Unauthorized", status: 401, data: [] };
    } else {
      monday.setToken(accessKey);
    }
    for (const userId of userIds.map((user) =>
      typeof user === "object" && "id" in user ? user.id : user
    )) {
      const query = `
      mutation($userId: ID!, $targetId: ID!, $text: String!, $targetType: NotificationTargetType!) {
      create_notification (user_id: $userId, target_id: $targetId, text: $text, target_type: $targetType) {
      text
      }
    }
      `;
      const variables = {
        targetId: target,
        userId: userId,
        text: text,
        targetType: "Project",
      };
      const res = await monday.api(query, { variables });
    }
    return {
      message: "Success sending notifications",
      status: 200,
      data: "Success",
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Error sending notifications",
      status: 500,
      data: error,
    };
  }
}

// Fins usernames for users
export const fetchUsernamesAndPhotoThumbs = async (userIds, creatorId) => {
  // Array needs to be passed to this query, sometimes try to find multiple also
  if (!Array.isArray(userIds)) {
    userIds = [userIds];
  }
  try {
    const accessKey = getCachedAccessKey(creatorId);
    if (!accessKey) {
      return { message: "Unauthorized", status: 401, data: [] };
    } else {
      monday.setToken(accessKey);
    }

    const query = `query {
        users (ids: ${JSON.stringify(userIds)}) {
          id
          name,
          photo_thumb
        }
      }
      `;
    const response = await monday.api(query);
    if (!response.data.users.length) {
      return { message: "No users found.", status: 404, data: [] };
    }
    return {
      message: "Successfully fetched usernames.",
      status: 200,
      data: response.data.users,
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Error finding usernames.",
      status: 500,
      data: error,
    };
  }
};

export const findItemGroupId = async (itemId, id) => {
  // Get api key
  const accessKey = getCachedAccessKey(id);
  if (!accessKey) {
    return { message: "Unauthorized", status: 401, data: [] };
  } else {
    monday.setToken(accessKey);
  }
  // Could potentially add a find access key from db if not cached, but should be cached at the beginning of every req
  try {
    const query = `
    query ($itemId: ID!) {
        items(ids: [$itemId]) {
          group {
            id
        }
      }
    }
  `;
    const variables = {
      itemId: itemId,
    };
    const results = await monday.api(query, { variables });
    if (results.data?.items?.length <= 0) {
      return {
        message:
          "No group matching this item, please ensure the item id is valid.",
        status: 400,
        data: results.data,
      };
    }
    return {
      message: "Group id found successfully.",
      status: 200,
      data: results.data?.items[0].group,
    };
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Internal server error.",
      status: error.status || 500,
      data: error,
    };
  }
};

export const findCreatedAtStatusChange = async (
  boardId,
  columnId,
  itemId,
  currentValue,
  userId
) => {
  // Get api key
  const accessKey = getCachedAccessKey(userId);
  if (!accessKey) {
    return { message: "Unauthorized", status: 401, data: [] };
  } else {
    monday.setToken(accessKey);
  }
  try {
    const query = `
      query($boardId: [ID!]) {
    boards(ids: $boardId) {
    activity_logs {
      created_at
      id
      event
      data
    }
  }
}
      `;
    const variables = {
      boardId: [boardId],
    };
    const res = await monday.api(query, { variables });
    const columnChangeUpdates = res.data.boards[0].activity_logs.filter(
      (log) => {
        const logData = JSON.parse(log.data);
        if (
          log.event === "update_column_value" &&
          logData.pulse_id === itemId &&
          logData.column_id === columnId &&
          logData.value.label.index === currentValue.label.index
        ) {
          return true;
        }
        return false;
      }
    );
    let myDate = new Date(columnChangeUpdates[0].created_at / 10000);
    let nowDate = new Date();
    return {
      message: "Success",
      status: 200,
      data: myDate ? myDate : nowDate.toISOString(),
    };
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Unknown error finding status update.",
      status: error.status || 500,
      data: error,
    };
  }
};

// Fetches all the user data for users assigned to the people column
export const fetchUsers = async (itemId, peopleColumnId, id) => {
  // Get api key
  const accessKey = getCachedAccessKey(id);
  if (!accessKey) {
    return { message: "Unauthorized", status: 401, data: [] };
  } else {
    monday.setToken(accessKey);
  }
  try {
    const query = `
    query ($itemId: ID!, $peopleColumnId: String!) {
      items(ids: [$itemId]){
        column_values(ids: [$peopleColumnId]){
          id 
          value
        }
      }
    }
    `;
    const variables = {
      itemId: itemId,
      peopleColumnId: peopleColumnId,
    };
    const res = await monday.api(query, { variables });
    const parsedValue = JSON.parse(res.data.items[0]?.column_values[0].value);
    // If there are no users asigned to the user column then lets see, use rate card id and if none then well
    return {
      message: "Success fetching users",
      status: 200,
      data: parsedValue?.personsAndTeams || [],
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Error fetching users",
      status: 500,
      data: error,
    };
  }
};
