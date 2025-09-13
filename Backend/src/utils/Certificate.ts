import fs from "fs";

class Certificate {
  static GetCredential(): { key: Buffer; cert: Buffer; rejectUnauthorized: boolean } {
    const privateKey = fs.readFileSync("certs/key.pem");
    const certificate = fs.readFileSync("certs/fullchain.pem");

    return { key: privateKey, cert: certificate, rejectUnauthorized: false };
  }
}

export default Certificate;
