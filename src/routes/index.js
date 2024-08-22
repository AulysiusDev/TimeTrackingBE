import express from "express";
import {
  createTimeEntriesController,
  deleteEntriesController,
  fetchTimeEntriesController,
} from "../controllers/common/entries-controller.js";
import {
  createLogConfigEntry,
  getLogConfig,
  startStopAutomation,
} from "../controllers/item/log-config-controller.js";
import {
  generateCsv,
  generateXlsx,
} from "../controllers/item/export-controller.js";
import { authorizeRegularRequest, authorizeRequest } from "../middleware.js";
import {
  handleAutomationTrigger,
  subscribe,
  unsubscribe,
} from "../controllers/item/automation-controller.js";
import { createJWT, getAuthKey, saveAuthKey } from "../auth/oauth.js";

const router = express.Router();

// Common
// **Auth**
router.post("/oauth/fetch-auth-key", authorizeRegularRequest, getAuthKey);
router.get("/oauth/callback", saveAuthKey);
router.post("/create-jwt", authorizeRegularRequest, createJWT);

// Entries
// Create logs
router.post(
  "/entries/create-time-entry",
  authorizeRegularRequest,
  createTimeEntriesController
);
// Fetch logs for display
router.post(
  "/entries/fetch-data",
  authorizeRegularRequest,
  fetchTimeEntriesController
);
router.delete(
  "/entries/delete-entries",
  authorizeRegularRequest,
  deleteEntriesController
);

// Item routes
// router.post("/start-stop-automation", startStopAutomation);
// router.post("/fetch-item-settings", getLogConfig);
// router.post("/create-log-config", createLogConfigEntry);
router.post("/generate-xlsx", authorizeRegularRequest, generateXlsx);
router.post("/generate-csv", authorizeRegularRequest, generateCsv);
// router.post("/automation-triggered", authorizeRequest, handleAutomationTrigger);
// router.post("/unsubscribe", authorizeRequest, unsubscribe);
// router.post("/subscribe", authorizeRequest, subscribe);

// // Object routes
// router.post("/fetch-entries", authorizeRegularRequest, fetchEntries);

export default router;
