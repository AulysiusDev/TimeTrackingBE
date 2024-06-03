import schema from "../schema/schemas.js";
import { findById } from "../services/crud.js";
import {
  validateAndCreateItem,
  validateAndCreateUsers,
} from "../services/entry-service.js";
import {
  fetchLogConfig,
  validateAndCreateAutomation,
  validateAndCreateLogConfig,
} from "../services/log-config-service.js";

export async function getLogConfig(req, res) {
  const itemId = req.params.itemId;
  let logConfigs;
  const logConfigRes = await fetchLogConfig(itemId);
  if (logConfigRes.status === 500) {
    return res
      .status(500)
      .json({ message: logConfigRes.message, data: logConfigRes.data });
  }
  if (logConfigRes.status === 200) {
    logConfigs = logConfigRes.data;
  }
  let configsWithAutomation = [];
  // Fetch automation if it exists as automation id on the logConfig obj
  for (const logConfig of logConfigs) {
    if (!logConfig.automationId)
      return configsWithAutomation.push({
        logConfig: logConfig,
        automation: null,
      });
    const automationRes = await findById(
      schema.AutomationTable,
      schema.AutomationTable.id,
      logConfig.automationId
    );
    configsWithAutomation.push({
      logConfig: logConfig,
      automation: automationRes.data[0],
    });
  }

  res.status(200).json({ message: "success", data: configsWithAutomation });
}

export async function createLogConfigEntry(req, res) {
  // Validate and create item
  const validatedItem = await validateAndCreateItem(req.body);
  if (validatedItem.status === 500) {
    return res.status(500).json({ message: "Server error." });
  }
  if (validatedItem.status === 400) {
    return res.status(400).json({ message: "Client error." });
  }
  const validatedUserId = await validateAndCreateUsers({
    id: parseInt(req.body.creatorId),
  });
  if (validatedUserId.status === 500 || validatedUserId.status === 400) {
    return res.status(validatedUserId.status).json(validatedUserId);
  }

  // Check if automation on item already exists, if it does, delete it and create new entry.
  const validatedAutomation = await validateAndCreateAutomation(req.body);
  if (validatedAutomation.status === 400) {
    return res.status(400).json({
      message:
        "Failed to validate data. Please ensure all fields are completed correctlt before submitting.",
    });
  } else if (validatedAutomation.status === 500) {
    return res
      .status(500)
      .json({ message: "Failed to validate data, please try again." });
  }
  // Validate and create log config
  req.body.automationId = validatedAutomation.data.id;

  const validatedLogConfig = await validateAndCreateLogConfig(req.body);
  if (validatedLogConfig.status === 500) {
    return res.status(validatedLogConfig.status).json({
      message: validatedLogConfig.message,
      data: validatedLogConfig.data,
    });
  }

  return res.status(201).json(validatedLogConfig);
}

// itemId: z.number(),
//     isSubitem: z.boolean(),
//     parentItemId: z.number().nullable(),
//     name: z.string(),
//     boardId: z.number(),
//     workspaceId: z.number(),

// userId: z.number(),

// scheduleId: integer("schedule_id").references(() => ScheduleTable.id),
// startDate: timestamp("start_date").defaultNow(),
// complete: boolean("complete").default(false),
// timerStartDate: timestamp("timer_start_date"),
// automationId: integer("automation_id").references(() => AutomationTable.id),
// createdAt: timestamp("created_at").defaultNow(),
