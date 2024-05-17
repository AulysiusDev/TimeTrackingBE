import { sql, relations } from "drizzle-orm";
import {
  text,
  pgTable,
  timestamp,
  serial,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

// User creates time entry, which creates an entry in the UsersTable.
// Users will appear in the Object View, where a RateCardTable entry can be created for them.

const UsersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  rateCardId: integer("rate_card_id").references(() => RateCardsTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

const userRelations = relations(UsersTable, ({ one }) => ({
  RateCardsTable: one(RateCardsTable),
}));

// // This table is used to store time table schedules for either the RateCardTable for individual users,
// //  ** or temporary schedules set in either Automate or Timer.
// // This entry will be used to determine how much time between a start and end date should be logged per day.

const ScheduleTable = pgTable("schedule", {
  id: serial("id").primaryKey(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  days: text("days_array")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
});

// // This table will be used to save the Automate settings and help the app determine whether to start, pause or create a LogsTable entry.
// // An entry here will be deleted when a user either changes for chooses to forget the last Automate settings they have chosen.

const AutomationTable = pgTable("automation", {
  id: serial("id").primaryKey(),
  defualt: boolean("default").default(true),
  statusColumnId: text("status_column_id").notNull(),
  startLabels: text("start_labels_array")
    .array()
    .default(sql`ARRAY[]::text[]`),
  endLabels: text("end_labels_array")
    .array()
    .default(sql`ARRAY[]::text[]`),
  pauseLabels: text("pause_labels_array")
    .array()
    .default(sql`ARRAY[]::text[]`),
});

// When a user creates an entry, starts Automate or starts Timer, an ItemTable Entry is created.
// This entry will set 'automate' to true if the entry is created through Automate, and an AutomationTable entry will be created as well, where the 'automationId' field will be populated subsequently.

const ItemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  isSubitem: boolean("is_subitem").default(false),
  parentItemId: integer("parent_item_id"),
  name: text("name").notNull(),
  boardId: text("board_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  automate: boolean("automate").default(false),
  automationId: integer("automation_id").references(() => AutomationTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

const itemsRelations = relations(ItemsTable, ({ one }) => ({
  AutomationTable: one(AutomationTable),
}));

// // This table to used to store configuration data about ongoing log tracking which has not been completed yet, namely Automate and Timer.
// // When an ItemTable entry is created with Automate, a LogConfigTable entry will be created. This will store the 'automationId'.
// // ** This will also store the scheduleId of the ScheduleTable entry which will be created when the Automate method is used.
// // ** Anytime the user pauses the tie tracking using Automate, a PauseLogsTable entry will be created and the pauseLogId stored here.
// // When a user wants to create a LogsTable entry using Timer, 'timerStartDate' will be populated with the now(), and be used to keep track of displaying the Timer count.
// // When the user has finished using the Timer and created a LogsTable entry, or if they either deleted Automate config
// // ** (an option to use the last automate config will be given) to reset settings, this entry will be deleted.
// // 'startDate' will be used for Automate in order to keep track of when a user triggers Automate to start tracking.
// // ** 'startDate' will be updated each time a user creates a LogsTable entry and triggers it is start again.
// // To know if an item has an ongoing either Timer or Automate setup, the LogsConfigTable will be searched for the entry where 'complete' is false,
// // ** there should only be one.

const LogConfigTable = pgTable("logConfigTable", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UsersTable.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => ItemsTable.id),
  subitemId: integer("subitem_id"),
  scheduleId: integer("schedule_id").references(() => ScheduleTable.id),
  startDate: timestamp("start_date").defaultNow(),
  complete: boolean("complete").default(false),
  timerStartDate: timestamp("timer_start_date"),
  automationId: integer("automation_id").references(() => AutomationTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

const logsConfigRelations = relations(LogConfigTable, ({ one }) => ({
  UsersTable: one(UsersTable),
  ItemsTable: one(ItemsTable),
  ScheduleTable: one(ScheduleTable),
  AutomationTable: one(AutomationTable),
}));

// // This table will be used to keep track of pauses in time tracking during Automate.
// // This table is used by the app to know how much time should not be included in the LogsTable in between start and end dates.

const PauseLogsTable = pgTable("pauseLogs", {
  id: serial("id").primaryKey(),
  logConfidId: integer("log_config_id").references(() => LogConfigTable.id),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  complete: boolean("complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

const pauseLogsRelations = relations(PauseLogsTable, ({ many }) => ({
  LogConfigTable: many(LogConfigTable),
}));

// // This table is used to store only completed logs.
// // When a user has either manually entered a log, triggered an 'endLabel' in Automate or reset the Timer,
// // ** an entry will be made in the LogsTable.
// // Retieving LogsTable entries for an individual user will be Select * Where userId is user.id
// // Retieving LogsTable entries for an individual item will be Select * Where itemId is item.id

const LogsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UsersTable.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => ItemsTable.id),
  date: timestamp("start_date").defaultNow().notNull(),
  totalHours: numeric("total_hours", { precision: 8, scale: 2 }),
  billableHours: numeric("billable_hours", { precision: 8, scale: 2 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

const logsRelations = relations(LogsTable, ({ many }) => ({
  UsersTable: many(UsersTable),
  ItemsTable: many(ItemsTable),
}));

// This table is used to save rates per hour for users, as well as the know to store the 'scheduleId' of users saves work schedules.

const RateCardsTable = pgTable("rateCards", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => ScheduleTable.id),
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }).default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

const rateCardRelations = relations(RateCardsTable, ({ one }) => ({
  ScheduleTable: one(ScheduleTable),
}));

const schemas = {
  UsersTable,
  userRelations,
  ScheduleTable,
  RateCardsTable,
  rateCardRelations,
  ItemsTable,
  itemsRelations,
  AutomationTable,
  PauseLogsTable,
  pauseLogsRelations,
  LogConfigTable,
  logsConfigRelations,
  LogsTable,
  logsRelations,
};

export default schemas;

// module.exports.UsersTable = UsersTable;
// module.exports.PauseLogsTable = PauseLogsTable;
// module.exports.ItemsTable = ItemsTable;
// module.exports.LogsTable = LogsTable;
// module.exports.RateCardsTable = RateCardsTable;
// module.exports.ScheduleTable = ScheduleTable;
// module.exports.LogConfigTable = LogConfigTable;
