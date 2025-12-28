import bcrypt from "bcryptjs";

const DEFAULT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? "12");

export class PasswordService {
  private static getRounds(): number {
    return Number.isFinite(DEFAULT_ROUNDS) && DEFAULT_ROUNDS > 0 ? DEFAULT_ROUNDS : 12;
  }

  static isBcryptHash(value: string): boolean {
    return /^\$2[aby]\$/.test(value);
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.getRounds());
  }

  static async verifyPassword(plain: string, stored: string): Promise<boolean> {
    if (!stored) return false;
    if (this.isBcryptHash(stored)) {
      return bcrypt.compare(plain, stored);
    }
    return stored === plain;
  }

  static async ensureHashed(stored: string, plain: string): Promise<string> {
    if (this.isBcryptHash(stored)) {
      return stored;
    }
    if (!(await this.verifyPassword(plain, stored))) {
      return stored;
    }
    return this.hashPassword(plain);
  }
}
