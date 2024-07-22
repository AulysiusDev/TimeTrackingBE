import schema, { LogConfigTable } from "../../schema/schemas.js";
import { updateField } from "../crud.js";
import { getDrizzleDbClient } from "../db-client.js";
import { and, eq, isNull, or } from "drizzle-orm";
import initMondayClient from "monday-sdk-js";
import { createTimeEntryService } from "./entry-service.js";
import { calculateHours, createDatesArr } from "../../helpers.js";

export async function handleAutomationTriggerService(payload) {
  const { previousColumnValue, columnValue, boardId, itemId, columnId } =
    payload.inboundFieldValues;
  const changedAt = await findCreatedAtStatusChange(
    boardId,
    columnId,
    itemId,
    columnValue
  );
  const logConfigRes = await fetchLogConfig(itemId, boardId, columnId);
  if (logConfigRes.status === 404) {
    return { status: 404, message: "No automations set", data: logConfigRes };
  }
  if (logConfigRes.status === 500) {
    return {
      status: 500,
      message: "Error fetching log configs from database",
      data: logConfigRes,
    };
  }
  const createLog = startOrComplete(
    JSON.parse(logConfigRes.data.startLabels),
    JSON.parse(logConfigRes.data.endLabels),
    columnValue
  );
  const assignedItemUsers = await fetchUsers(
    itemId,
    logConfigRes.data.peopleColumnId
  );
  // THIS ERROR NEEDS TO BE HANDLED SERVER SIDE CORRECLTY WITH NOTIFICATIONS ETC
  if (!assignedItemUsers.data) {
    return { message: "No user assigned", status: 404, data: [] };
  }
  // If starting tracking for entry log
  if (createLog === false) {
    const updateRes = await updateField(
      LogConfigTable,
      LogConfigTable.id,
      LogConfigTable.startDate,
      { startDate: new Date() },
      logConfigRes.data.id
    );
    const notificationText = `A new time tracking log has been opened for you on item-${itemId}. To end the tracking and create the log, change the status to match the specified "End label".`;
    await sendNotifications(
      assignedItemUsers.data.personsAndTeams.map((obj) => obj.id),
      itemId,
      notificationText
    );
  }
  // If label changed to unrelated label but time tracking start date has been set
  if (
    createLog === null &&
    logConfigRes.data.startDate !== null &&
    // Possibly uneeded condition
    assignedItemUsers.data !== null
  ) {
    const notificationText = `Item-${itemId}'s status has changed to neither a start or end label. This item is still tracking time, please be aware this automation is still active and tracking!`;
    await sendNotifications(
      assignedItemUsers.data.personsAndTeams.map((obj) => obj.id),
      itemId,
      notificationText
    );
  }
  // Create entry log and reset start date to null
  if (createLog === true) {
    console.log("Creating log");
    logConfigRes.data.endDate = changedAt.data
      ? new Date(changedAt.data)
      : new Date(Date.now());
    const datesArr = createDatesArr(logConfigRes.data);
    console.log({ datesArr });
    for (const date of datesArr) {
      const hours = parseFloat(
        calculateHours(logConfigRes.data, date).toFixed(2)
      );
      const response = await createTimeEntryService({
        boardId: boardId,
        workspaceId: logConfigRes.data.workspaceId,
        date: new Date(date),
        note: "Automated time entry log",
        subitemId: logConfigRes.data.subitemId,
        totalHours: hours,
        billableHours: logConfigRes.data.category === "NB" ? null : hours,
        userIds: assignedItemUsers.data.personsAndTeams.map((obj) => obj.id),
        ratePerHour: logConfigRes.data.ratePerHour,
        currency: logConfigRes.data.currency,
        subitemId: logConfigRes.data.subitemId,
        itemId: logConfigRes.data.itemId,
      });
    }

    const notificationText = `A new log entry has been created for you on item-${itemId}`;
    await sendNotifications(
      assignedItemUsers.data.personsAndTeams.map((obj) => obj.id),
      itemId,
      notificationText
    );

    const response = await updateField(
      LogConfigTable,
      LogConfigTable.id,
      LogConfigTable.startDate,
      { startDate: null },
      logConfigRes.data.id
    );
  }

  return {
    status: 200,
    data: null,
    message: "Successfull creation of entry log",
  };
}

// Fetches the log config either for a specific item (first condition) or the board as a whole (second condition)
export async function fetchLogConfig(itemId, boardId, columnId) {
  const db = await getDrizzleDbClient();
  try {
    const results = await db
      .select()
      .from(schema.LogConfigTable)
      .where(
        or(
          and(
            eq(schema.LogConfigTable.itemId, itemId),
            eq(schema.LogConfigTable.statusColumnId, columnId),
            eq(schema.LogConfigTable.active, true)
          ),
          and(
            isNull(schema.LogConfigTable.itemId),
            eq(schema.LogConfigTable.boardId, boardId),
            eq(schema.LogConfigTable.statusColumnId, columnId),
            eq(schema.LogConfigTable.active, true)
          )
        )
      );
    if (!results.length) {
      return { message: "No log configs", status: 404, data: [] };
    }
    return { message: "Success", status: 200, data: results[0] };
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error fetching Log Config",
      status: error.status || 500,
      data: error,
    };
  }
}
// Checks if status change should trigger the creation of time entry (true), start of time entry (false), or neither (null)
export function startOrComplete(startLabels, endLabels, currentLabel) {
  let start = null;
  startLabels.forEach((labelObj) => {
    if (labelObj.index === currentLabel.label.index) return (start = false);
  });
  endLabels.forEach((labelObj) => {
    if (labelObj.index === currentLabel.label.index) return (start = true);
  });
  return start;
}
// Fetches all the user data for users assigned to the people column
export async function fetchUsers(itemId, peopleColumnId) {
  const monday = initMondayClient();
  monday.setToken(process.env.MONDAY_API_TOKEN);
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
    return {
      message: "Success fetching users",
      status: 200,
      data: JSON.parse(res.data.items[0].column_values[0].value),
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Error fetching users",
      status: 500,
      data: error,
    };
  }
}
// Send s a notification to a user. (target is the id of the thing updating about)
export async function sendNotifications(userIds, target, text) {
  const monday = initMondayClient();
  monday.setToken(process.env.MONDAY_API_TOKEN);
  try {
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
        userId: userId,
        text: text,
        targetType: "Project",
      };
      const res = await monday.api(query, { variables });
      console.dir({ res }, { depth: null });
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
async function findCreatedAtStatusChange(
  boardId,
  columnId,
  itemId,
  currentValue
) {
  const monday = initMondayClient();
  monday.setToken(process.env.MONDAY_API_TOKEN);
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
    return {
      message: "Success sending notifications",
      status: 200,
      data: myDate,
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
