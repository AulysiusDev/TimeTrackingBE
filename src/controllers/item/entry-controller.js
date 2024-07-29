import { createTimeEntryService } from "../../services/item/entry-service.js";

export async function createTimeEntry(req, res) {
  console.log({ body: req.body });
  try {
    const result = await createTimeEntryService(req.body);

    if (result.status === 201) {
      return res.status(201).json(result);
    } else {
      return res.status(result.status).json(result);
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}
