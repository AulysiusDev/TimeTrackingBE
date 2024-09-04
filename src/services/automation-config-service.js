import { validateAndCreateUsers } from "./common/create-entries-service.js";
import { createEntries, updateField } from "./crud.js";
import { AutomationConfigTable } from "../schema/schemas.js";
import { fetchAccessKey } from "../auth/oauth.js";
import { cacheAccessKey } from "../auth/cache.js";
import { validateAutomationConfig } from "../db/validators.js";
import { findAutomationConfigs } from "./advanced-crud.js";
import { findItemGroupId } from "./monday-service.js";
import { safeJsonParse } from "../helpers.js";

export const createAutomatonConfigService = async (entryData) => {
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
  const accessKeyRes = await fetchAccessKey(entryData.user.creatorId);
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
    ratePerHour: entryData.rateCard.rate || null,
    currency: entryData.rateCard.currency?.value || null,
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
  const createRes = await createEntries(AutomationConfigTable, newConfigObj);
  return createRes;
}

export const fetchAutomationConfigService = async (
  boardId,
  itemId = null,
  id
) => {
  if (!id) {
    return { message: "Unauthorized.", status: 401, data: [] };
  }
  if (!boardId) {
    return { message: "No board id provided.", data: [] };
  }
  try {
    //  Cache access key
    const accessKeyRes = await fetchAccessKey(id);
    if (accessKeyRes.status === 401) {
      return accessKeyRes;
    }
    cacheAccessKey(id, accessKeyRes.data);

    // if the item id is not null, then we are searching for all automations for that item,
    // ... automations for the entrie group the item is in will be relevant,
    // ... even though the itemId won't be present on the automation, but the group id will be
    let groupId = null;
    if (itemId) {
      const findItemGroupIdRes = await findItemGroupId(boardId, itemId, id);
      if (findItemGroupIdRes.status === 400) {
        return findItemGroupIdRes;
      } else {
        groupId = findItemGroupIdRes.data.id || null;
      }
    }
    // Reques is for board wide automations
    const fetchAutomationConfigRes = await findAutomationConfigs(
      boardId,
      groupId,
      itemId || null
    );
    if (
      Array.isArray(fetchAutomationConfigRes) &&
      fetchAutomationConfigRes.data.length <= 0
    ) {
      return fetchAutomationConfigRes;
    } else {
      const formattedAutomationConfigs = formatAutomationConfigs(
        fetchAutomationConfigRes.data
      );
      return {
        message: "Success.",
        status: 200,
        data: formattedAutomationConfigs,
      };
    }
  } catch (error) {
    console.error(error);
    return { message: error.message || "Internal server error.", data: error };
  }
};

// Parse stringed properties
const formatAutomationConfigs = (automationConfigs) => {
  let automationConfigsArray = automationConfigs;
  if (!Array.isArray(automationConfigs)) {
    automationConfigsArray = [automationConfigs];
  }
  return automationConfigsArray.map((automationConfig) => {
    return {
      ...automationConfig,
      startLabels: safeJsonParse(automationConfig.startLabels, []),
      endLabels: safeJsonParse(automationConfig.endLabels, null),
      customDays: safeJsonParse(automationConfig.customDays, []),
    };
  });
};

export const enableDisableAutomationService = async (id, action) => {
  console.log({ action });
  try {
    const enableDisableRes = await updateField(
      AutomationConfigTable,
      AutomationConfigTable.id,
      AutomationConfigTable.active,
      { active: action },
      id
    );
    if (enableDisableRes.status === 200) {
      const startDateRes = await updateField(
        AutomationConfigTable,
        AutomationConfigTable.id,
        AutomationConfigTable.startDate,
        { startDate: null },
        id
      );
      if (startDateRes.status === 200) {
        return {
          message: "Fields updated successfully.",
          status: 200,
          data: [...startDateRes.data, ...enableDisableRes.data],
        };
      } else {
        return {
          message:
            "Automation enabled/disbaled successfully, but failed to update start date.",
          status: startDateRes.status,
          data: startDateRes.data,
        };
      }
    } else {
      return {
        message: "Failed to enable/disable automation.",
        status: enableDisableRes.status,
        data: enableDisableRes.data,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error updating fields.",
      status: error.status || 500,
      data: error,
    };
  }
};
