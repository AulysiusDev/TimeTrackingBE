import { Logger } from "@mondaycom/apps-sdk";
import jwt from "jsonwebtoken";
import { getSecret } from "./helpers.js";

const MONDAY_SIGNING_SECRET = "MONDAY_SIGNING_SECRET";

export const authorizeRequest = (req, res, next) => {
  const logTag = "AuthorizationMiddleware";
  const logger = new Logger(logTag);
  try {
    let { authorization } = req.headers;
    if (!authorization && req.query) {
      authorization = req.query.token;
    }
    const signingSecret = getSecret(MONDAY_SIGNING_SECRET);
    const { accountId, userId, backToUrl, shortLivedToken } = jwt.verify(
      authorization,
      signingSecret
    );
    req.session = { accountId, userId, backToUrl, shortLivedToken };
    console.log({ session: req.session });
    next();
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Not authenticated" });
  }
};

export const authorizeRegularRequest = (req, res, next) => {
  let authHeader = req.headers.authorization;
  let token = authHeader;
  if (authHeader && authHeader.split(" ").length === 2) {
    token = authHeader && authHeader.split(" ")[1];
  }
  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.CLIENT_SECRET, (err, data) => {
    if (err) {
      console.error(err);
      return res.sendStatus(403);
    }
    req.sessionData = data;
    next();
  });
};
