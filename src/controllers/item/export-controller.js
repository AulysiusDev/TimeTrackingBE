import {
  configTimeStamps,
  convertJsonToCsv,
  convertJsonToXLSX,
} from "../../services/item/export-service.js";

export async function generateXlsx(req, res) {
  let { exportLogs } = req.body;
  const logs = configTimeStamps(exportLogs.logs);
  const { excelBuffer } = convertJsonToXLSX(logs);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="log.xlsx"`);
  res.status(200).send(excelBuffer);
}

export async function generateCsv(req, res) {
  let { exportLogs } = req.body;
  const logs = configTimeStamps(exportLogs.logs);
  const csvFile = convertJsonToCsv(logs);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="log.csv"`);
  res.status(200).send(csvFile);
}
