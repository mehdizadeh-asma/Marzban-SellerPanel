import type { IAccount } from "../../models/Account";
import type MarzbanAccount from "../../models/MarzbanAccount";

export type MarzbanAccountsCacheEntry = { users: MarzbanAccount[]; timestamp: number };
export type SellerAccountsCacheEntry = { accounts: IAccount[]; timestamp: number };

export type MarzbanAccountsCache = Record<string, Record<string, MarzbanAccountsCacheEntry>>;
export type SellerAccountsCache = Record<string, Record<string, SellerAccountsCacheEntry>>;

let marzbanAccountsCache: MarzbanAccountsCache = {};
let sellerAccountsCache: SellerAccountsCache = {};

export const getMarzbanAccountsCache = (): MarzbanAccountsCache => marzbanAccountsCache;
export const setMarzbanAccountsCache = (value: MarzbanAccountsCache): void => {
  marzbanAccountsCache = value;
};

export const getSellerAccountsCache = (): SellerAccountsCache => sellerAccountsCache;
export const setSellerAccountsCache = (value: SellerAccountsCache): void => {
  sellerAccountsCache = value;
};

export const invalidateSellerAllCache = (seller: string): void => {
  if (marzbanAccountsCache[seller]) {
    delete marzbanAccountsCache[seller]["all"];
    delete marzbanAccountsCache[seller]["unpaid"];
  }
};

export const invalidateSellerAccountCache = (sellerId: string): void => {
  if (sellerAccountsCache[sellerId]) {
    delete sellerAccountsCache[sellerId]["all"];
    delete sellerAccountsCache[sellerId]["unpaid"];
  }
};

export const upsertSellerAccountCache = (sellerId: string, account: IAccount): void => {
  const sellerCache = sellerAccountsCache[sellerId];
  if (!sellerCache) return;

  Object.entries(sellerCache).forEach(([cacheKey, entry]) => {
    if (!Array.isArray(entry.accounts)) return;
    const existingIndex = entry.accounts.findIndex((acc) => acc.Username === account.Username);
    const shouldInclude = cacheKey !== "unpaid" || account.Payed === false;

    if (!shouldInclude) {
      if (existingIndex !== -1) {
        entry.accounts.splice(existingIndex, 1);
      }
      return;
    }

    if (existingIndex === -1) {
      entry.accounts.push(account);
      return;
    }
    entry.accounts[existingIndex] = account;
  });
};

export const removeSellerAccountFromCache = (sellerId: string, username: string): void => {
  const sellerCache = sellerAccountsCache[sellerId];
  if (!sellerCache) return;

  Object.values(sellerCache).forEach((entry) => {
    if (!Array.isArray(entry.accounts)) return;
    entry.accounts = entry.accounts.filter((acc) => acc.Username !== username);
  });
};

export const upsertMarzbanAccountCache = (seller: string, account: MarzbanAccount): void => {
  const sellerCache = marzbanAccountsCache[seller];
  if (!sellerCache) return;

  Object.values(sellerCache).forEach((entry) => {
    if (!Array.isArray(entry.users)) return;
    const existingIndex = entry.users.findIndex((user) => user.username === account.username);
    if (existingIndex === -1) {
      entry.users.push(account);
      return;
    }
    entry.users[existingIndex] = { ...entry.users[existingIndex], ...account };
  });
};

export const patchMarzbanAccountCache = (
  seller: string,
  username: string,
  patch: Partial<MarzbanAccount>,
): void => {
  const sellerCache = marzbanAccountsCache[seller];
  if (!sellerCache) return;

  Object.values(sellerCache).forEach((entry) => {
    if (!Array.isArray(entry.users)) return;
    const existingIndex = entry.users.findIndex((user) => user.username === username);
    if (existingIndex === -1) return;
    entry.users[existingIndex] = { ...entry.users[existingIndex], ...patch };
  });
};

export const removeMarzbanAccountFromCache = (seller: string, username: string): void => {
  const sellerCache = marzbanAccountsCache[seller];
  if (!sellerCache) return;

  Object.values(sellerCache).forEach((entry) => {
    if (!Array.isArray(entry.users)) return;
    entry.users = entry.users.filter((user) => user.username !== username);
  });
};
