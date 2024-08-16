import initMondayClient from "monday-sdk-js";
import { fetchAuthToken } from "../auth/oauth.js";
const monday = initMondayClient();

// Fetch item names as only id saved (target name saved now, is this function neccessary?!)
export async function fetchItemName(id) {
  try {
    // Access key fetchung and setting
    const accessKeyRes = await fetchAuthToken(userIds[0]);
    if (accessKeyRes.status !== 200) {
      return { message: accessKeyRes.message, status: 401, data: [] };
    } else {
      monday.setToken(accessKeyRes.data);
    }
    const query = `query{
      items(ids: [${id}]){
        name
      }
    }`;
    const response = await monday.api(query);
    return response;
  } catch (error) {
    console.error(error);
    return "Could not locate item id";
  }
}

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

  const monday = initMondayClient();
  try {
    // Access key fetchung and setting
    const accessKeyRes = await fetchAuthToken(creatorId);
    if (accessKeyRes.status !== 200) {
      return { message: accessKeyRes.message, status: 401, data: [] };
    } else {
      monday.setToken(accessKeyRes.data);
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
export const findUsernames = async (userIds) => {
  // Array needs to be passed to this query, sometimes try to find multiple also
  if (!Array.isArray(userIds)) {
    userIds = [userIds];
  }
  try {
    // Access key fetchung and setting
    const accessKeyRes = await fetchAuthToken(userIds[0]);
    if (accessKeyRes.status !== 200) {
      return { message: accessKeyRes.message, status: 401, data: [] };
    } else {
      monday.setToken(accessKeyRes.data);
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
