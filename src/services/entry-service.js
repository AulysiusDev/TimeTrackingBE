import { validateItem, validateLog, validateUser } from "../db/validators.js";
import schemas from "../schema/schemas.js";
import { createEntry, findById } from "./crud.js";
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
    boardId: body.boardId,
    workspaceId: body.workspaceId,
  };
  //   let id = isSubitem ? body.subitemId : body.itemId;
  //   Check if entry already exists
  let checkItemExists;
  let errorMessage = `${isSubitem ? "Subitem" : "Item"} entry already exists`;
  let itemExists = false;
  try {
    checkItemExists = await findById(
      schemas.ItemsTable,
      schemas.ItemsTable.id,
      id
    );
  } catch (error) {
    return { message: errorMessage, data: error, status: 500 };
  }
  if (checkItemExists.status === 200) {
    itemExists = true;
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
    const newItem = await createEntry(schemas.ItemsTable, data);
    return {
      message: "New item entry created and data validated.",
      data: newItem.data,
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
  console.log(userObj);
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
    const user = await findById(
      schemas.UsersTable,
      schemas.UsersTable.id,
      data.id
    );
    if (user.status === 404) {
      // Create new entry in UserTable if none exists for that userId
      const newUser = await createEntry(schemas.UsersTable, {
        id: data.id,
      });
      return {
        message: "New user created.",
        data: newUser.data.id,
        status: 201,
      };
    } else {
      return { message: "User found.", data: user.data[0].id, status: 200 };
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
    const newLogEntry = await createEntry(schemas.LogsTable, data);
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
