import express from "express";
import { createTimeEntry } from "../controllers/item/entry-controller.js";
import {
  createLogConfigEntry,
  getLogConfig,
  startStopAutomation,
} from "../controllers/item/log-config-controller.js";
import {
  generateCsv,
  generateXlsx,
} from "../controllers/item/export-controller.js";
import {
  deleteEntries,
  fetchHours,
} from "../controllers/item/display-controller.js";
import { authorizeRegularRequest, authorizeRequest } from "../middleware.js";
import {
  handleAutomationTrigger,
  subscribe,
  unsubscribe,
} from "../controllers/item/automation-controller.js";
import { fetchEntries } from "../controllers/object/entries-controller.js";
import { createJWT, getAuthKey, saveAuthKey } from "../auth/oauth.js";

const router = express.Router();

// Common
// **Auth**
router.post("/oauth/fetch-auth-key", authorizeRegularRequest, getAuthKey);
router.get("/oauth/callback", saveAuthKey);
router.post("/create-jwt", authorizeRegularRequest, createJWT);
// Item routes
// router.post("/start-stop-automation", startStopAutomation);
// router.post("/fetch-item-settings", getLogConfig);
// router.post("/create-log-config", createLogConfigEntry);
router.post("/create-time-entry", authorizeRegularRequest, createTimeEntry);
// router.post("/fetch-hours", fetchHours);
// router.delete("/delete-entries", deleteEntries);
// router.post("/generate-xlsx", generateXlsx);
// router.post("/generate-csv", generateCsv);
// router.post("/automation-triggered", authorizeRequest, handleAutomationTrigger);
// router.post("/unsubscribe", authorizeRequest, unsubscribe);
// router.post("/subscribe", authorizeRequest, subscribe);

// // Object routes
// router.post("/fetch-entries", authorizeRegularRequest, fetchEntries);

export default router;
