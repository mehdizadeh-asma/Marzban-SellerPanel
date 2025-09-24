import fs from "fs";
import Certificate from "../../src/utils/Certificate";

jest.mock("fs");

describe("Certificate utils", () => {
  it("should read certificate files and return their buffers", () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => Buffer.from("x"));
    const c = Certificate.GetCredential();
    expect(c.key).toBeInstanceOf(Buffer);
    expect(c.cert).toBeInstanceOf(Buffer);
    expect(c.rejectUnauthorized).toBe(false);
  });
});
