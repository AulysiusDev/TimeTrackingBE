import express from "express";
import {
  createTimeEntriesController,
  deleteEntriesController,
  fetchTimeEntriesController,
} from "../controllers/entries-controller.js";
import {
  generateCsv,
  generateXlsx,
} from "../controllers/item/export-controller.js";
import { authorizeRegularRequest, authorizeRequest } from "../middleware.js";
import { createJWT, getAuthKey, saveAuthKey } from "../auth/oauth.js";
import {
  createAutomationConfigController,
  enableDisableAutomationController,
  fetchAutomationConfigController,
  subscribeController,
  unsubscribeController,
} from "../controllers/automation-controller.js";
import { handleAutomationTriggerController } from "../controllers/automation-controller.js";

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

router.post(
  "/automate/create-automation-config",
  authorizeRegularRequest,
  createAutomationConfigController
);
router.post(
  "/automate/fetch-automation-configs",
  authorizeRegularRequest,
  fetchAutomationConfigController
);
router.post(
  "/automate/enable-disable-automation",
  authorizeRegularRequest,
  enableDisableAutomationController
);

// Item routes
router.post("/generate-xlsx", authorizeRegularRequest, generateXlsx);
router.post("/generate-csv", authorizeRegularRequest, generateCsv);
router.post(
  "/automate/automation-triggered",
  authorizeRequest,
  handleAutomationTriggerController
);
router.post("/unsubscribe", authorizeRequest, unsubscribeController);
router.post("/subscribe", authorizeRequest, subscribeController);

export default router;
