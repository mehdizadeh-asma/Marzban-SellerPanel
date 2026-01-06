import { promises as fs } from "fs";
import path from "path";

import type { JsonData } from "@/context/MyContext";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const filepath = path.join(process.cwd(), "data", "config.json");
    const fileContents = await fs.readFile(filepath, "utf8");

    const jd = JSON.parse(fileContents) as JsonData;
    const newjd = {
      BACKEND_URL: jd.BACKEND_URL,
      IGNORE_TRAFFIC_TO_REMOVE: jd.IGNORE_TRAFFIC_TO_REMOVE,
      RENEW_FORCE_TO_PAID: jd.RENEW_FORCE_TO_PAID,
      RENEW_FORCE_TO_LIMITED_AND_EXPIRED: jd.RENEW_FORCE_TO_LIMITED_AND_EXPIRED,
      PAGE_TITLE: jd.PAGE_TITLE,
      CHANNEL_NAME: jd.CHANNEL_NAME,
    };

    return Response.json(newjd);
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Failed to load config." }, { status: 500 });
  }
}
