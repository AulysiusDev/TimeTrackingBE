import express from "express";
import { createTimeEntry } from "../controllers/neon-postgres-controller.js";
import {
  createLogConfigEntry,
  getLogConfig,
} from "../controllers/log-config-controller.js";
import { generateCsv, generateXlsx } from "../controllers/export-controller.js";
import {
  deleteEntries,
  fetchHours,
} from "../controllers/display-controller.js";

const router = express.Router();

router.get("/fetch-item-settings/:itemId", getLogConfig);
router.post("/create-log-config", createLogConfigEntry);
router.post("/create-time-entry", createTimeEntry);
router.post("/fetch-hours", fetchHours);
router.delete("/delete-entries", deleteEntries);
router.post("/generate-xlsx", generateXlsx);
router.post("/generate-csv", generateCsv);

export default router;
