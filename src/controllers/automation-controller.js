import { createAutomatonService } from "../services/automation-config-service.js";

export const createAutomationConfigController = async (req, res) => {
  const { entryData } = req.body;
  if (!entryData) {
    return res.status(400).json({ message: "No input data provided" });
  }
  try {
    const result = await createAutomatonService(entryData);
    return res.status(201).json(result);
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error", data: error });
  }
};
