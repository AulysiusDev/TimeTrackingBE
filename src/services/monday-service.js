import initMondayClient from "monday-sdk-js";

export async function fetchItemName(id) {
  const monday = initMondayClient();
  monday.setToken(process.env.MONDAY_API_TOKEN);
  try {
    const query = `query{
      items(ids: [${id}]){
        name
      }
    }`;
    const response = await monday.api(query);
    return response;
  } catch (error) {
    console.error(error);
    return "Could not locate item id";
  }
}
