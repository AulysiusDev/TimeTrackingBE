import { validateRatecard } from "../../db/validators.js";
import { RatecardTable, UsersTable } from "../../schema/schemas.js";
import { createEntries, deleteByIds, findAll, findById } from "../crud.js";

export const createRatecardsService = async (ratecards) => {
  const validatedRatecardsRes = await validateAndCreateRatecards(ratecards);
  console.dir({}, { depth: null });
  if (validatedRatecardsRes.status !== 200) {
    return validatedRatecardsRes;
  }

  const findUserRes = await findById(
    UsersTable,
    UsersTable.id,
    ratecards[0].updatedBy
  );
  console.dir({ findUserRes }, { depth: null });
  if (findUserRes.status !== 200) {
    const createUserRes = await createEntries(UsersTable, {
      id: ratecards[0].updatedBy,
    });
    if (createUserRes.status !== 201) {
      return createUserRes;
    }
  }

  const createRatecardsRes = await createEntries(
    RatecardTable,
    validatedRatecardsRes.data
  );
  if (createRatecardsRes.status == 201) {
    const parsedRatecards = parseRatecards(createRatecardsRes.data);
    return {
      message: createRatecardsRes.message,
      status: 201,
      data: parsedRatecards,
    };
  } else {
    return createRatecardsRes;
  }
};

const validateAndCreateRatecards = async (ratecards) => {
  const validatedRatecards = [];

  for (const ratecard of ratecards) {
    const ratecardObj = {
      ...ratecard,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { data, hasError, message } = await validateRatecard(ratecardObj);
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
    } else {
      validatedRatecards.push({ ...data, days: JSON.stringify(data.days) });
    }
  }
  if (Array.isArray(validatedRatecards) && !validatedRatecards.length) {
    return {
      message: "No validated ratecards.",
      status: 500,
      data: validatedRatecards,
    };
  }
  console.log({ validatedRatecards });
  return {
    message: "All ratecards validated.",
    status: 200,
    data: validatedRatecards,
  };
};

export const fetchRatecardsService = async () => {
  const fetchRatecardsRes = await findAll(RatecardTable);
  return fetchRatecardsRes;
};

export const deleteRatecardsService = async (ratecards) => {
  const ids = ratecards.map((ratecard) => ratecard.id);
  const deleteRes = deleteByIds(RatecardTable, RatecardTable.id, ids);
  return deleteRes;
};
const parseRatecards = (ratecards) => {
  return ratecards.map((ratecard) => ({
    ...ratecard,
    days: ratecard.days ? JSON.parse(ratecard.days) : [],
    rate: ratecard.rate ? parseFloat(ratecard.rate) : null,
  }));
};
