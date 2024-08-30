import { validateAutomationConfig } from "../../db/validators.js";
import schema from "../../schema/schemas.js";
import schemas from "../../schema/schemas.js";
import { createEntries, findById } from "../crud.js";
import initMondayClient from "monday-sdk-js";
import { addUsernames } from "./display-service.js";

export async function fetchLogConfigs(id, item) {
  const schemaToUse = item
    ? schemas.LogConfigTable.itemId
    : schemas.LogConfigTable.boardId;
  try {
    const res = await findById(schemas.LogConfigTable, schemaToUse, id);
    if (res.status === 500) {
      return { message: "Failed to fetch", status: 500, data: null };
    }
    return { message: "Success", status: 200, data: res.data };
  } catch (error) {
    console.error(error);
    return { message: "Failed to fetch", status: 500, data: null };
  }
}

export async function validateAndCreateLogConfig(logConfigObj) {
  const { message, hasError, data } = await validateAutomationConfig(
    logConfigObj
  );
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

  const newConfigObj = {
    ...data,
    customDays: JSON.stringify(data.customDays),
    startLabels: JSON.stringify(data.startLabels),
    endLabels: JSON.stringify(data.endLabels),
  };
  const createRes = await createEntries(schema.LogConfigTable, newConfigObj);
  return createRes;
}

export async function formatLogConfigs(logConfigs) {
  let formattedLogConfigs = [];
  // parse stringified arrays
  for (const logConfig of logConfigs) {
    const newConfigObj = {
      ...logConfig,
      startLabels: JSON.parse(logConfig.startLabels) || [],
      endLabels: JSON.parse(logConfig.endLabels) || [],
      customDays: JSON.parse(logConfig.customDays) || [],
    };
    // Add column titles for display
    const statusColumnTitleRes = await fetchTitle(
      newConfigObj.boardId,
      newConfigObj.statusColumnId
    );
    if (statusColumnTitleRes.status === 500) {
      newConfigObj.statusColumnTitle = "(Not found)";
    } else {
      newConfigObj.statusColumnTitle = statusColumnTitleRes.data;
    }
    const peopleColumnTitleRes = await fetchTitle(
      newConfigObj.boardId,
      newConfigObj.peopleColumnId
    );
    if (peopleColumnTitleRes.status === 500) {
      newConfigObj.peopleColumnTitle = "(Not found)";
    } else {
      newConfigObj.peopleColumnTitle = peopleColumnTitleRes.data;
    }
    const labelsRes = await fetchSettingsStr(newConfigObj);
    newConfigObj.endLabels.forEach((labelObj, i) => {
      newConfigObj.endLabels[i].color =
        labelsRes.data.labels_colors[labelObj.index].color;
    });
    newConfigObj.startLabels.forEach((labelObj, i) => {
      newConfigObj.startLabels[i].color =
        labelsRes.data.labels_colors[labelObj.index].color;
    });
    formattedLogConfigs.push(newConfigObj);
  }
  const namesWithLogs = await addUsernames(formattedLogConfigs);
  return (formattedLogConfigs = namesWithLogs.data);
}

export async function fetchTitle(boardId, columnId) {
  const monday = initMondayClient();
  monday.setToken(process.env.MONDAY_API_TOKEN);
  try {
    const query = `
    query ($boardId: [ID!], $columnId: [String]) {
      boards(ids: $boardId){
        columns(ids: $columnId){
          title
        }
      }
    }
    `;
    const variables = {
      boardId: [boardId],
      columnId: [columnId],
    };
    const res = await monday.api(query, { variables });
    return {
      message: "Success",
      status: 200,
      data: res.data.boards[0].columns[0].title,
    };
  } catch (error) {
    console.error(error);
    return {
      message:
        error?.message || "There was an error fetching the status column title",
      status: 500,
      data: error,
    };
  }
}
async function fetchSettingsStr(logConfig) {
  const monday = initMondayClient();
  monday.setToken(process.env.MONDAY_API_TOKEN);
  try {
    const query = `
    query($boardId: [ID!], $columnId: [String]){
      boards(ids: $boardId){
        columns(ids: $columnId){
          settings_str
        }
      }
    }`;
    const variables = {
      boardId: [logConfig.boardId],
      columnId: [logConfig.statusColumnId],
    };
    const res = await monday.api(query, { variables });
    return {
      message: "success",
      status: 200,
      data: JSON.parse(res.data.boards[0].columns[0].settings_str),
    };
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error fetching label color hexes",
      status: 500,
      data: error,
    };
  }
}
