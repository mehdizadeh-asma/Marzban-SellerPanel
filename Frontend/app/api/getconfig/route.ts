import path from "path";
import { promises as fs } from "fs";
import { encrypt } from "@/utils/Crypto";
import { JsonData } from "@/context/MyContext";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filepath = path.join(process.cwd(), "data", "config.json");
    const fileContents = await fs.readFile(filepath, "utf8");

    const jd: JsonData = JSON.parse(fileContents);
    const newjd = {
      BACKEND_URL: jd.BACKEND_URL,
      IGNORE_TRAFFIC_TO_REMOVE: jd.IGNORE_TRAFFIC_TO_REMOVE,
      RENEW_FORCE_TO_PAID: jd.RENEW_FORCE_TO_PAID,
      RENEW_FORCE_TO_LIMITED_AND_EXPIRED: jd.RENEW_FORCE_TO_LIMITED_AND_EXPIRED,
      PAGE_TITLE: jd.PAGE_TITLE,
      CHANNEL_NAME: jd.CHANNEL_NAME,
    };
    console.log(newjd);

    const encryptedContent = encrypt(JSON.stringify(newjd));

    return new Response(encryptedContent);
  } catch (error) {
    console.log(error);
    return new Response(null);
  }
}
