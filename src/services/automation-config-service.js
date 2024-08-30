import { validateAndCreateUsers } from "./common/create-entries-service.js";
import { createEntries } from "./crud.js";
import { LogConfigTable } from "../schema/schemas.js";
import { fetchAccessKey } from "../auth/oauth.js";
import { cacheAccessKey } from "../auth/cache.js";
import { validateAutomationConfig } from "../db/validators.js";

export const createAutomatonService = async (entryData) => {
  if (!entryData?.sessionToken) {
    return {
      message:
        "No session token present in this request for authorization. Please reload the app and contact developers if this error persists.",
      status: 403,
      data: [],
    };
  }
  // Validate user objects and create them in db if not already, this is so rate crads can be created etc.
  const validatedUsersRes = await validateAndCreateUsers(entryData);
  if (validatedUsersRes.status === 500 || validatedUsersRes.status === 400) {
    return { status: validatedUsersRes.status, ...validatedUsersRes };
  }
  //  Cache access key
  const accessKeyRes = fetchAccessKey(entryData.user.creatorId);
  if (accessKeyRes.status === 401) {
    return accessKeyRes;
  }
  cacheAccessKey(entryData.user.creatorId, accessKeyRes.data);
  const logConfigObject = createAutomationConfigObject(entryData);
  const validateAndCreateAutomationConfigRes =
    await validateAndCreateAutomationConfig(logConfigObject);
  if (validateAndCreateAutomationConfigRes.status === 500) {
    return validateAndCreateAutomationConfigRes;
  }
  const formattedAutomationConfig = {
    ...validateAndCreateAutomationConfigRes.data[0],
    customDays:
      JSON.parse(validateAndCreateAutomationConfigRes.data[0].customDays) || [],
    startLabels:
      JSON.parse(validateAndCreateAutomationConfigRes.data[0].startLabels) ||
      [],
    endLabels:
      JSON.parse(validateAndCreateAutomationConfigRes.data[0].endLabels) || [],
  };

  return {
    message: "Automation config created successfully",
    status: 201,
    data: formattedAutomationConfig,
  };
};

const createAutomationConfigObject = (entryData) => {
  const startLabelsArray = entryData.autoConfig.labels.start.map(
    (label) => label.hex
  );
  const endLabelsArray = entryData.autoConfig.labels.end.map(
    (label) => label.hex
  );
  return {
    name: entryData.log.name,
    workspaceId: entryData.item.workspaceId,
    boardId: entryData.item.boardId,
    groupId: entryData.item.groupId,
    userId: entryData.user.creatorId,
    itemId: entryData.item.id,
    startDate: new Date(),
    custom: entryData.schedule.custom,
    schedule: entryData.schedule.option,
    customDays: entryData.schedule.days || null,
    default: entryData.autoConfig.defaultStatusLabels,
    statusColumnId: entryData.autoConfig.columns.status.id,
    peopleColumnId: entryData.autoConfig.columns.people.id,
    startLabels: startLabelsArray,
    endLabels: endLabelsArray,
    rateCardId: entryData.rateCard.id || null,
    ratePerHour: entryData.rateCard.rate,
    currency: entryData.rateCard.currency?.value,
    endTime: parseFloat(entryData.autoConfig.time.end?.value) || null,
    startTime: parseFloat(entryData.autoConfig.time.start?.value) || null,
    subitemId: entryData.item.subitemId?.id || null,
    active: true,
    hours: entryData.autoConfig.time.hours,
  };
};

export async function validateAndCreateAutomationConfig(logConfigObj) {
  const { message, hasError, data } = await validateAutomationConfig(
    logConfigObj
  );
  if (hasError === true) {
    return {
      message: message
        ? message
        : "Invalid inputs for request. Please try again.",
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
  const createRes = await createEntries(LogConfigTable, newConfigObj);
  return createRes;
}
