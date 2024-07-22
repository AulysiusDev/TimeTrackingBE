import XLSX from "xlsx";

export function convertJsonToXLSX(logs) {
  // Convert logs to worksheet
  const ws = XLSX.utils.json_to_sheet(logs);

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "logs");

  // Write workbook to buffer
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

  // Write buffer to file
  // const filePath = `${fileName}${format}`;
  // fs.writeFileSync(filePath, excelBuffer);

  // Set headers for file download

  return { excelBuffer };
}
export function convertJsonToCsv(jsonData) {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    return "";
  }

  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map((obj) => headers.map((header) => obj[header]));

  const csvContent =
    headers.join(",") + "\n" + rows.map((row) => row.join(",")).join("\n");

  return csvContent;
}

export function configTimeStamps(logs) {
  for (const log of logs) {
    for (const [key, value] of Object.entries(log)) {
      if (key === "date") {
        log[key] = value.split("T")[0];
      } else if (key === "createdAt") {
        const date = new Date(value);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date
          .getDate()
          .toString()
          .padStart(2, "0")} ${date
          .getHours()
          .toString()
          .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        log[key] = formattedDate;
      }
    }
  }
  return logs;
}
