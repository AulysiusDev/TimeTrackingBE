import initMondayClient from "monday-sdk-js";

export async function addUsernames(itemsLogs) {
  const mondayClient = initMondayClient();
  mondayClient.setToken(process.env.MONDAY_API_TOKEN);
  let usersArr;
  let uniqueUserIdsArr = createUniqueIdsArr(itemsLogs);
  try {
    const query = `query {
        users (ids: ${JSON.stringify(uniqueUserIdsArr)}) {
          id
          name
        }
      }
      `;

    const response = await mondayClient.api(query);
    usersArr = await response.data.users;
  } catch (error) {
    console.error(error);
    return "Error finding names";
  }
  for (let user of usersArr) {
    const userId = parseInt(user.id);
    itemsLogs.forEach((log) => {
      if (log.userId === userId) {
        log.username = user.name;
      }
    });
  }
  return itemsLogs;
}

export function createUniqueIdsArr(itemsLogs) {
  const mondayClient = initMondayClient();
  mondayClient.setToken(process.env.MONDAY_API_TOKEN);
  const uniqueIdsArr = new Set();
  for (const log of itemsLogs) {
    uniqueIdsArr.add(log.userId);
  }
  return Array.from(uniqueIdsArr);
}

// export function exportToXLSX(logs, fileName) {
//   console.log(fileName);
//   // Get the directory name
//   const ws = XLSX.utils.json_to_sheet(logs);
//   const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, ws, "logs");

//   XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
//   XLSX.write(wb, { bookType: "xlsx", type: "binary" });

//   XLSX.writeFile(wb, "logs" + fileName);

//   console.log("XLSX file saved:", "logs" + fileName);

//   return true;
// }
