import { findEntries } from "../../services/object/entries-service.js";

export async function fetchEntries(req, res) {
  const entriesRes = findEntries(req.body.userId);
  console.log({ body: req.body, timestamp: new Date() });
  return res.status(200).send({});
}
