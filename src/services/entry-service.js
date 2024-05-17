import { validateItem, validateLog, validateUser } from "../db/validators.js";
import {
  addUser,
  createItemEntry,
  createLogEntry,
  fetchItem,
  getUser,
} from "./crud.js";
import { fetchItemName } from "./monday-service.js";

export async function validateAndCreateItem(body) {
  // Create item obj from body
  const isSubitem = body.subitemId !== null;
  let id = isSubitem ? body.subitemId : body.itemId;
  let parentItemId = isSubitem ? body.itemId : null;
  let itemObj = {
    id: id,
    isSubitem: isSubitem,
    parentItemId: parentItemId,
    name: null,
    boardId: body.boardId,
    workspaceId: body.workspaceId,
    automate: body.automate,
    automationId: body.automationId,
  };
  //   let id = isSubitem ? body.subitemId : body.itemId;
  //   Check if entry already exists
  let checkItemExists;
  let errorMessage = `${isSubitem ? "Subitem" : "Item"} entry already exists`;
  let itemExists = false;
  try {
    checkItemExists = await fetchItem(id);
  } catch (error) {
    return { message: errorMessage, data: error, status: 500 };
  }
  if (checkItemExists === "Item entry exists") {
    itemExists = true;
  }

  try {
    // Fetch item name from monday
    const name = await fetchItemName(id);
    itemObj.name = name.data.items[0].name;
  } catch (error) {
    return { message: "Error fetching item name", data: error, status: 500 };
  }

  // Validate item data
  const { data, hasError, message } = await validateItem(itemObj);
  if (hasError === true) {
    return {
      message: message ? message : "Invalid request. Please try again.",
      data: { hasError },
      status: 400,
    };
  } else if (hasError === undefined) {
    return {
      message: message ? message : "Data validaton error.",
      data: { hasError },
      status: 500,
    };
  }
  if (itemExists) {
    return {
      message: "Item aleady existed and data has been validated.",
      data: data,
      status: 200,
    };
  }
  // Create entry in ItemsTable
  try {
    const newItem = await createItemEntry(data);
    return {
      message: "New item entry created and data validated.",
      data: newItem,
      status: 201,
    };
  } catch (error) {
    console.error(error);
    return {
      message: message ? message : "Error creating item entry.",
      data: error,
      status: 500,
    };
  }
}

export async function validateAndCreateUsers(userObj) {
  // Validate user
  const { data, hasError, message } = await validateUser(userObj);
  if (hasError === true) {
    return {
      message: message ? message : "Invalid request. Please try again.",
      data: { hasError },
      status: 400,
    };
  } else if (hasError === undefined) {
    return {
      message: message ? message : "Data validaton error.",
      data: { hasError },
      status: 500,
    };
  }
  // Check if user already exists
  try {
    const user = await getUser(data.id);
    if (user === "No user found") {
      // Create new entry in UserTable if none exists for that userId
      const newUser = await addUser({
        user: {
          id: data.id,
        },
      });
      return { message: "New user created.", data: newUser.id, status: 201 };
    } else {
      return { message: "User found.", data: user.id, status: 200 };
    }
  } catch (error) {
    console.error(error);
    return { message: "Error creating user.", data: error, status: 500 };
  }
}
export async function validateAndCreateLog(logData) {
  const { data, hasError, message } = await validateLog(logData);
  if (hasError === true) {
    return {
      message: message || "Invalid data request. Please try again.",
      data: { hasError },
      status: 500,
    };
  } else if (hasError === undefined) {
    return {
      message: message || "Invalid data request. Please try again.",
      data: { hasError },
      status: 500,
    };
  }
  try {
    const newLogEntry = await createLogEntry(data);
    if (newLogEntry === "Error creating Log entry") {
      return { message: newLogEntry, data: newLogEntry, status: 500 };
    } else {
      return { message: "New log created.", data: newLogEntry, status: 201 };
    }
  } catch (error) {
    console.error(error);
    return { message: "Error creating user.", data: error, status: 500 };
  }
}
