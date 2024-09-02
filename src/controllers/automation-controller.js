import {
  createAutomatonService,
  fetchAutomationConfigService,
} from "../services/automation-config-service.js";

export const createAutomationConfigController = async (req, res) => {
  const { entryData } = req.body;
  if (!entryData) {
    return res.status(400).json({ message: "No input data provided." });
  }
  try {
    const result = await createAutomatonService(entryData);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Internal server error.",
      data: error,
    });
  }
};

export const fetchAutomationConfigController = async (req, res) => {
  const { boardId, itemId, id } = req.body;
  if (!boardId) {
    return res.status(400).json({ message: "No board id provided." });
  }
  if (!id) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  try {
    const results = await fetchAutomationConfigService(
      boardId,
      itemId || null,
      id
    );
    if (results.status === 404) {
      return res
        .status(200)
        .json({ message: "No automation configs found.", data: [] });
    } else {
      return res.status(results.status).json({
        message: `${results.data.length} automation config${
          results.data.length === 1 ? "s" : ""
        } found.`,
        data: results.data,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({
      message: error.message || "Internal server error.",
      data: error,
    });
  }
};
