import { relations } from "drizzle-orm";
import {
  text,
  pgTable,
  timestamp,
  serial,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

const UsersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }).default(0),
  startTime: integer("start_time"),
  endTime: integer("end_time"),
  days: text("days_array"),
  team: text("team"),
  currency: text("currency").default("USD"),
  accessKey: text("access_key"),
  createdAt: timestamp("created_at").defaultNow(),
  timezoneOffset: integer("timezone_offset").default(0),
});

// const ItemsTable = pgTable("items", {
//   id: serial("id").primaryKey(),
//   isSubitem: boolean("is_subitem").default(false),
//   parentItemId: integer("parent_item_id"),
//   boardId: text("board_id").notNull(),
//   workspaceId: text("workspace_id").notNull(),
//   createdAt: timestamp("created_at").defaultNow(),
// });

const AutomationConfigTable = pgTable("automationconfig", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UsersTable.id),
  itemId: text("item_id"),
  subitemId: text("subitem_id"),
  // Automation has to set on a certian board with specific status/people columns,
  // ...unlike creating logs etc. Thus board id is required
  //
  boardId: text("board_id").notNull(),
  groupId: text("group_id"),
  workspaceId: text("workspace_id").notNull(),
  // This gets set when the automation gets started, and it gets cleared when automation is stopped
  startDate: timestamp("start_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  peopleColumnId: text("people_column_id").notNull(),
  // 0 is Hours per Day, 1 is Work Schedule, 2 is RateCard
  schedule: integer("schedule").default(0).notNull(),
  // Mon-fri = false, custom days = true
  custom: boolean("custom").default(false),
  // Empty if custom is true
  customDays: text("custom_days_array").default("[]"),
  // Default status column or custom
  default: boolean("default").default(true),
  statusColumnId: text("status_column_id").notNull(),
  startLabels: text("start_labels_array").default("[]"),
  endLabels: text("end_labels_array").default("[]"),
  // Time user starts work if schedule is 0 or 1
  startTime: integer("start_time"),
  // Time user enxs work if schedule is 1
  endTime: integer("end_time"),
  hours: numeric("hours", { precision: 8, scale: 2 }),
  name: text("name"),
  // This will be the user id if schedule is 2
  rateCardId: integer("rate_card_id").references(() => UsersTable.id, {
    relationName: "rateCard",
  }),
  category: text("category").default("NB").notNull(),
  // Can be set, can be null, anc can use rate card instead
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }),
  currency: text("currency").default("USD"),
  active: boolean("active").default(false),
});

const AutomationConfigRelations = relations(
  AutomationConfigTable,
  ({ one }) => ({
    user: one(UsersTable, {
      relationName: "user",
      fields: [AutomationConfigTable.userId],
      references: [UsersTable.id],
    }),
    rateCard: one(UsersTable, {
      relationName: "rateCard",
      fields: [AutomationConfigTable.rateCardId],
      references: [UsersTable.id],
    }),
  })
);
// Can create logs for items, boards or workspaces
const LogsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UsersTable.id),
  itemId: text("item_id"),
  subitemId: text("subitem_id"),
  boardId: text("board_id"),
  groupId: text("group_id"),
  workspaceId: text("workspace_id").notNull(),
  targetName: text("target_name"),
  date: timestamp("date").defaultNow().notNull(),
  totalHours: numeric("total_hours", { precision: 8, scale: 2 }),
  billableHours: numeric("billable_hours", { precision: 8, scale: 2 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }).default(
    null
  ),
  currency: text("currency").default(null),
  // 0: Not yet submitted, 1: Submitted not yet dis/approved, 2: Submitted and approved, 3: Submitted but disapproved
  status: integer("status").default(0).notNull(),
});

const logsRelations = relations(LogsTable, ({ many }) => ({
  users: many(UsersTable),
}));

export {
  UsersTable,
  AutomationConfigTable,
  AutomationConfigRelations,
  LogsTable,
  logsRelations,
};
const schema = {
  UsersTable,
  AutomationConfigTable,
  AutomationConfigRelations,
  LogsTable,
  logsRelations,
};

export default schema;
