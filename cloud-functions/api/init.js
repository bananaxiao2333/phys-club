import { json, handleError, onRequestOptions } from "../lib/response.js";
import { seedDefaultData } from "../lib/database.js";

export async function onRequestPost(context) {
  try {
    await seedDefaultData();
    return json({
      success: true,
      message: "KV collections initialized",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
