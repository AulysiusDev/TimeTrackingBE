import express from "express";
import {
  createTimeEntry,
  deleteEntries,
  fetchHours,
  generateCsv,
  generateXlsx,
} from "../controllers/neon-postgres-controller.js";

const router = express.Router();

router.post("/create-time-entry", createTimeEntry);
router.post("/fetch-hours", fetchHours);
router.delete("/delete-entries", deleteEntries);
router.post("/generate-xlsx", generateXlsx);
router.post("/generate-csv", generateCsv);

export default router;

// router.use(mondayRoutes);
// router.post('/item-id', authenticationMiddleware, neonPostgresController.printId);
// router.post('/find-user-by-id', neonPostgresController.findUserById);
// router.get('/', neonPostgresController.getUsers);
