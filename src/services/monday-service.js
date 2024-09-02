import initMondayClient from "monday-sdk-js";
import { fetchAuthToken, getAndSetAccessKey } from "../auth/oauth.js";
import { getCachedAccessKey } from "../auth/cache.js";
const monday = initMondayClient();

// // Fetch item names as only id saved (target name saved now, is this function neccessary?!)
// export async function fetchItemName(id, creatorId) {
//   try {
//     const authorized = await getAndSetAccessKey(creatorId);
//     if (!authorized) {
//       return { message: "Unauthorized", status: 401, data: [] };
//     }
//     const query = `query{
//       items(ids: [${id}]){
//         name
//       }
//     }`;
//     const response = await monday.api(query);
//     return response;
//   } catch (error) {
//     console.error(error);
//     return "Could not locate item id";
//   }
// }

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
    for (const userId of userIds) {
      const query = `
      mutation($userId: ID!, $targetId: ID!, $text: String!, $targetType: NotificationTargetType!) {
      create_notification (user_id: $userId, target_id: $targetId, text: $text, target_type: $targetType) {
      text
      }
    }
      `;
      const variables = {
        targetId: target,
        userId: parseInt(userId.id),
        text: text,
        targetType: "Project",
      };
      await monday.api(query, { variables });
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
export const findUsernames = async (userIds, creatorId) => {
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
          name
        }
      }
      `;
    const response = await monday.api(query);
    return {
      message: "Successfully fetched usernames.",
      status: 200,
      data: response,
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

export const findItemGroupId = async (boardId, itemId, id) => {
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
