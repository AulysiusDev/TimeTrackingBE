// controllers/automationController.js
import { handleAutomationTriggerService } from "../../services/item/automation-service.js";

export async function handleAutomationTrigger(req, res) {
  console.log("Automation triggered");
  try {
    const result = await handleAutomationTriggerService(req.body.payload);
    console.log({ result });
    return res.status(200).send({});
    // }
  } catch (error) {
    console.error(error);
    return res.status(200).send({});
  }
}

export async function subscribe(req, res) {
  // console.log({ body: req.body });
  console.log("subscribed");
  res.status(200).send({});
}

export async function unsubscribe(req, res) {
  // console.log({ body: req.body });
  console.log("unsubscribed");
  res.status(200).send({});
}
