import path from "path";
import { promises as fs } from "fs";
import { encrypt } from "@/utils/Crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filepath = path.join(process.cwd(), "data", "config.json");
    const fileContents = await fs.readFile(filepath, "utf8");

    // Encrypt the file content
    const encryptedContent = encrypt(fileContents);

    return new Response(encryptedContent);
  } catch (error) {
    console.log(error);
    return new Response(null);
  }
}
