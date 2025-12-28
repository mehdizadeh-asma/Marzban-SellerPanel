import { PasswordService } from "../../src/services/security/PasswordService";

describe("PasswordService", () => {
  it("hashes and verifies passwords with bcrypt", async () => {
    const plain = "Strong#Pass123";
    const hash = await PasswordService.hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(PasswordService.isBcryptHash(hash)).toBe(true);
    await expect(PasswordService.verifyPassword(plain, hash)).resolves.toBe(true);
  });

  it("verifies plain text fallback values", async () => {
    await expect(PasswordService.verifyPassword("plain", "plain")).resolves.toBe(true);
    await expect(PasswordService.verifyPassword("plain", "other")).resolves.toBe(false);
  });

  it("returns false when stored value is empty", async () => {
    await expect(PasswordService.verifyPassword("plain", "")).resolves.toBe(false);
  });

  it("falls back to default rounds when env is invalid", async () => {
    const originalRounds = process.env.BCRYPT_ROUNDS;
    process.env.BCRYPT_ROUNDS = "0";
    jest.resetModules();
    const {
      PasswordService: FreshPasswordService,
    } = require("../../src/services/security/PasswordService");
    const hash = await FreshPasswordService.hashPassword("plain");
    expect(FreshPasswordService.isBcryptHash(hash)).toBe(true);
    process.env.BCRYPT_ROUNDS = originalRounds;
  });

  it("ensureHashed returns original bcrypt values", async () => {
    const plain = "Another#Pass";
    const hash = await PasswordService.hashPassword(plain);
    await expect(PasswordService.ensureHashed(hash, plain)).resolves.toBe(hash);
  });

  it("ensureHashed hashes when stored value is plain text", async () => {
    const plain = "plainSecret";
    const ensured = await PasswordService.ensureHashed(plain, plain);

    expect(ensured).not.toBe(plain);
    expect(PasswordService.isBcryptHash(ensured)).toBe(true);
    await expect(PasswordService.verifyPassword(plain, ensured)).resolves.toBe(true);
  });

  it("ensureHashed keeps stored value when plain mismatches", async () => {
    const stored = "stored";
    await expect(PasswordService.ensureHashed(stored, "other")).resolves.toBe(stored);
  });
});
