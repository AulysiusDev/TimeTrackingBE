import { createTimeEntryService } from "../../services/item/entry-service.js";

export async function createTimeEntry(req, res) {
  const { entryData } = req.body;
  if (!entryData) {
    return res.status(400).json({
      message: "No log data was provided to create a time entry with.",
      data: null,
    });
  }
  try {
    const result = await createTimeEntryService(entryData);

    return res.status(result.status).json({
      message: res.message || "There was an error creating time entries.",
      data: res.data || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
