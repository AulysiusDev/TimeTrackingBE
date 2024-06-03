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

const RateCardsTable = pgTable("ratecards", {
  id: serial("id").primaryKey(),
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }).default(0),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  days: text("days_array")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

const UsersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  rateCardId: integer("rate_card_id").references(() => RateCardsTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

const userRelations = relations(UsersTable, ({ one }) => ({
  rateCard: one(RateCardsTable, {
    fields: [UsersTable.rateCardId],
    references: [RateCardsTable.id],
  }),
}));

const AutomationTable = pgTable("automation", {
  id: serial("id").primaryKey(),
  default: boolean("default").default(true),
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
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  days: text("days_array")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
});

const ItemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  isSubitem: boolean("is_subitem").default(false),
  parentItemId: integer("parent_item_id"),
  name: text("name").notNull(),
  boardId: text("board_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const LogConfigTable = pgTable("logconfig", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UsersTable.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => ItemsTable.id),
  subitemId: integer("subitem_id"),
  startDate: timestamp("start_date").defaultNow(),
  complete: boolean("complete").default(false),
  timerStartDate: timestamp("timer_start_date"),
  automationId: integer("automation_id").references(() => AutomationTable.id),
  automateActive: boolean("automate_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

const logsConfigRelations = relations(LogConfigTable, ({ one }) => ({
  user: one(UsersTable),
  item: one(ItemsTable),
  automation: one(AutomationTable),
}));

const PauseLogsTable = pgTable("pauselogs", {
  id: serial("id").primaryKey(),
  logConfigId: integer("log_config_id").references(() => LogConfigTable.id),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  complete: boolean("complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

const pauseLogsRelations = relations(PauseLogsTable, ({ one }) => ({
  logConfig: one(LogConfigTable),
}));

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
  users: many(UsersTable),
  items: many(ItemsTable),
}));

export {
  RateCardsTable,
  AutomationTable,
  UsersTable,
  userRelations,
  ItemsTable,
  LogConfigTable,
  logsConfigRelations,
  PauseLogsTable,
  pauseLogsRelations,
  LogsTable,
  logsRelations,
};
const schema = {
  RateCardsTable,
  AutomationTable,
  UsersTable,
  userRelations,
  ItemsTable,
  LogConfigTable,
  logsConfigRelations,
  PauseLogsTable,
  pauseLogsRelations,
  LogsTable,
  logsRelations,
};

export default schema;
