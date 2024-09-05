import schemas, { UsersTable } from "../schema/schemas.js";
import { createEntries, findById, updateField } from "../services/crud.js";
import jwt from "jsonwebtoken";
import initMondayClient from "monday-sdk-js";
import { getCachedAccessKey } from "./cache.js";

const monday = initMondayClient();

// Fetch auth key from db, create user if not, but still need api key.
export const getAuthKey = async (req, res) => {
  const { sessionToken } = req.body;
  //   Unlock session token for user details
  const token = jwt.verify(sessionToken, process.env.CLIENT_SECRET);
  const { user_id } = token.dat;
  try {
    // Verify if usrer has api key saved or not, create user if none exists
    const authTokenRes = await fetchAuthToken(user_id);
    // Server error
    if (authTokenRes.status === 500) {
      return res.status(500).json(authTokenRes);

      // No access key found in db
    } else if (authTokenRes.status === 201 || authTokenRes.status === 404) {
      return res
        .status(authTokenRes.status)
        .json({ message: "No access key found" });

      // Access key found
    } else if (authTokenRes.status === 200) {
      return res.status(200).json({ message: "Success", data: {} });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json(authTokenRes);
  }
};

// Auth callback function once user has authenticated app permissions
export const saveAuthKey = async (req, res) => {
  const { code, state, token } = req.query;
  //   Unlock state token to gets params (request origin validation) and user details
  const tokenRes = jwt.verify(state, process.env.CLIENT_SECRET);

  //   Invalid request params
  if (
    tokenRes.client_id !== process.env.CLIENT_ID ||
    !code ||
    !tokenRes.user_id
  ) {
    return res.status(403).json({ message: "Invalid request." });
  }
  //   Get access key from monday api, save in UsersTable db
  const fetchSaveAccessKeyRes = await fetchSaveAccessKey(
    code,
    tokenRes.user_id
  );
  //   Failed to save
  if (
    fetchSaveAccessKeyRes.status !== 200 &&
    fetchSaveAccessKeyRes.status !== 201
  ) {
    return res.status(fetchSaveAccessKeyRes.status).json(fetchSaveAccessKeyRes);

    // Construct redirect_uri
  } else {
    const redirectUri = `https://${token.slug}.monday.com/${
      token.params.boardId ? `boards/${token.params.boardId}` : ""
    }${token.params.itemId ? `/pulses/${token.params.itemId}` : ""}`;

    res.redirect(redirectUri);
  }
};

// User for client to recieve a jwt token for auth
export const createJWT = async (req, res) => {
  const data = req.body.sessionToken;
  if (!data) {
    return res
      .status(400)
      .json({ message: "No token data provided.", data: {} });
  } else {
    const sessionTokenData = jwt.verify(data, process.env.CLIENT_SECRET);
    const dataToJWT = {
      client_id: sessionTokenData.dat.client_id,
      user_id: sessionTokenData.dat.user_id,
      account_id: sessionTokenData.dat.accountId,
      //Slug & params used to contruct the redirect uri
      slug: sessionTokenData.dat.slug,
      params: req.body.params,
    };
    const newJWT = jwt.sign(dataToJWT, process.env.CLIENT_SECRET);
    return res.status(200).json({ message: "Success", data: newJWT });
  }
};

// Fetch a user's access key from the db
// Call this from other functions to get api key before interacting with monday.com api
export const fetchAuthToken = async (userId) => {
  // If user obejct sent here, then use just the userId
  if (typeof userId === "object" && userId !== null && "id" in userId) {
    userId = userId.id;
  }
  try {
    // Fetch user from db
    const authRes = await findById(UsersTable, UsersTable.id, userId);
    // Error 500 server
    if (authRes.status === 500) {
      return {
        ...authRes,
        message: authRes.message || "Error fetching user.",
      };
      // 404, no user found
    } else if (authRes.status === 404) {
      // Create user
      const createUserRes = await createEntries(UsersTable, {
        id: parseInt(userId),
      });
      // Error creating user
      if (createUserRes.status !== 201) {
        return createUserRes;
      }

      return {
        message: "User created, no api stored.",
        status: 201,
        data: createUserRes.data,
      };
      // User found
    } else if (
      authRes?.data &&
      Array.isArray(authRes.data) &&
      authRes.data.length >= 1
    ) {
      // Has api key
      if (authRes.data[0].accessKey) {
        return {
          status: 200,
          message: "Access key successfully found.",
          data: authRes.data[0].accessKey,
        };
      } else {
        // User found, no api key
        return {
          status: 404,
          message: "User found with no api key.",
          data: authRes.data[0],
        };
      }
    }
  } catch (error) {
    console.error(error);
    return {
      message: error.message || "Error fetching user api key.",
      status: error.status || 500,
      data: error,
    };
  }
};

// Part of the callback function after user has approved permissions
const fetchSaveAccessKey = async (code, userId) => {
  try {
    const token = await monday.oauthToken(
      code,
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET
    );

    if (!token) {
      return { message: "Invalid request.", status: 500, data: [] };
    }
    // Check if user exists in db, create one if not
    const authRes = await findById(UsersTable, UsersTable.id, userId);
    // Error 500 server
    if (authRes.status === 500) {
      return {
        ...authRes,
        message: authRes.message || "Error fetching user.",
      };
      // 404, no user found
    } else if (authRes.status === 404) {
      // Create user with access key
      const createUserRes = await createEntries(UsersTable, {
        id: parseInt(userId),
        accessKey: token.access_token,
      });
      // Error creating user
      if (createUserRes.status !== 201) {
        return createUserRes;
      } else if (createUserRes.status === 201) {
        return {
          message: "User created and access token saved.",
          status: 201,
          data: createUserRes.data,
        };
      }
    }

    // User already exists in db, update field to add access token.
    const saveTokenRes = await updateField(
      UsersTable,
      UsersTable.id,
      UsersTable.accessKey,
      { accessKey: token.access_token },
      userId
    );
    if (saveTokenRes.status !== 200) {
      return saveTokenRes;
    }
    return {
      message: "Access token saved successfully.",
      status: 200,
      data: saveTokenRes.data || [],
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Invalid request.",
      status: 500,
      data: error,
    };
  }
};

// Used by functions to get an access key which has been saved to the db, will return 401 if not found (shouldn't happen but just in case),
// Return 200 if found and the api key to access monday data of the creator's account.
export const fetchAccessKey = async (userId) => {
  // Find creators access key, or use oAuth if not provided yet
  const creatorRes = await findById(
    schemas.UsersTable,
    schemas.UsersTable.id,
    userId
  );
  if (creatorRes.status !== 200) {
    return { message: creatorRes.message, data: creatorRes.data, status: 500 };
  }
  //   No access key provided
  const accessKey = creatorRes.data[0]?.accessKey;
  if (!accessKey) {
    return {
      message: "Unauthorized",
      status: 401,
      data: { id: userId },
    };
  }
  // Found and return
  return { message: "Authorized", status: 200, data: accessKey };
};

export const getAndSetAccessKey = async (creatorId) => {
  const cachedAccessKey = getCachedAccessKey(creatorId);
  if (!cachedAccessKey) {
    // Access key fetchung and setting
    const accessKeyRes = await fetchAuthToken(creatorId);
    if (accessKeyRes.status !== 200) {
      return false;
    } else {
      monday.setToken(accessKeyRes.data);
    }
  } else {
    monday.setToken(cachedAccessKey);
  }
  return true;
};
