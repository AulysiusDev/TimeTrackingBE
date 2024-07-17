import express from "express";
import { Logger } from "@mondaycom/apps-sdk";
import { getSecret, isDevelopmentEnv, getEnv } from "./src/helpers.js";
import dotenv from "dotenv";
import cors from "cors";
import router from "./src/routes/index.js";
dotenv.config();

const logTag = "ExpressServer";
const PORT = "PORT";
const SERVICE_TAG_URL = "SERVICE_TAG_URL";

const logger = new Logger(logTag);
const currentPort = getSecret(PORT); // Port must be 8080 to work with monday code
const currentUrl = getSecret(SERVICE_TAG_URL);

const app = express();
app.use(express.json());
app.use(cors());
app.use(router);

app.listen(currentPort, () => {
  if (isDevelopmentEnv()) {
    logger.info(`app running locally on port ${currentPort}`);
  } else {
    logger.info(
      `up and running listening on port:${currentPort}`,
      "server_runner",
      {
        env: getEnv(),
        port: currentPort,
        url: `https://${currentUrl}`,
      }
    );
  }
});
app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ message: `Server Running on port ${currentPort}` });
});
