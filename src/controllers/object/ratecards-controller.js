import {
  createRatecardsService,
  deleteRatecardsService,
  fetchRatecardsService,
} from "../../services/object/ratecards-service.js";

export const createRatecardsController = async (req, res) => {
  const { ratecards } = req.body;
  if (!ratecards || (Array.isArray(ratecards) && !ratecards.length)) {
    return res
      .status(400)
      .json({ message: "Invalid ratecard input.", data: [] });
  }
  const createRatecardsServiceRes = await createRatecardsService(ratecards);
  return res.status(createRatecardsServiceRes.status).json({
    message: createRatecardsServiceRes.message,
    data: createRatecardsServiceRes.data,
  });
};

export const fetchRatecardsController = async (req, res) => {
  const fetchRatecardsServiceRes = await fetchRatecardsService();
  console.dir({ fetchRatecardsServiceRes }, { depth: null });
  return res.status(fetchRatecardsServiceRes.status).json({
    message: fetchRatecardsServiceRes.message,
    data: fetchRatecardsServiceRes.data,
  });
};

export const deleteRatecardsController = async (req, res) => {
  const { ratecards } = req.body;
  console.log({ ratecards });
  if (!ratecards || (Array.isArray(ratecards) && !ratecards.length)) {
    return res
      .status(400)
      .json({ message: "Empty ratecards to delete array.", data: ratecards });
  }
  const deleteRatecardsRes = await deleteRatecardsService(ratecards);
  return res
    .status(deleteRatecardsRes.status)
    .json({
      message: deleteRatecardsRes.message,
      data: deleteRatecardsRes.data,
    });
};
