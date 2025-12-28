import type { Connection } from "mongoose";

import { copyDatabase } from "../../src/db/DbCopyService";

describe("DbCopyService", () => {
  const createCursor = <T>(items: T[]): AsyncIterable<T> => ({
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) {
        yield item;
      }
    },
  });

  it("skips insertMany when all collections are empty", async () => {
    const documentsByModel: Record<string, unknown[]> = {
      Account: [],
      Seller: [],
      Tariff: [],
      TariffInbound: [],
      TariffSeller: [],
    };
    const mainConnection = {
      model: jest.fn((name: string) => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(documentsByModel[name] ?? []),
        }),
      })),
    } as unknown as Connection;
    const insertMany = jest.fn();
    const targetConnection = {
      model: jest.fn(() => ({ insertMany })),
    } as unknown as Connection;
    const getConnection = jest.fn().mockResolvedValue(targetConnection);
    const closeConnection = jest.fn().mockResolvedValue(undefined);

    await copyDatabase("mongodb://dest", { mainConnection, getConnection, closeConnection });

    expect(insertMany).not.toHaveBeenCalled();
    expect(closeConnection).toHaveBeenCalledWith("mongodb://dest");
  });

  it("uses cursor when available and copies documents", async () => {
    const mainConnection = {
      model: jest.fn(() => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            cursor: () => createCursor([{ _id: "1" }]),
          }),
        }),
      })),
    } as unknown as Connection;
    const insertMany = jest.fn().mockResolvedValue(undefined);
    const targetConnection = {
      model: jest.fn(() => ({ insertMany })),
    } as unknown as Connection;
    const getConnection = jest.fn().mockResolvedValue(targetConnection);
    const closeConnection = jest.fn().mockResolvedValue(undefined);

    await copyDatabase("mongodb://dest", { mainConnection, getConnection, closeConnection });

    expect(insertMany).toHaveBeenCalled();
  });

  it("batches cursor inserts when dataset exceeds batch size", async () => {
    const docs = Array.from({ length: 501 }, (_, index) => ({ _id: index }));
    const mainConnection = {
      model: jest.fn((name: string) => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            cursor: () => createCursor(name === "Account" ? docs : []),
          }),
        }),
      })),
    } as unknown as Connection;
    const insertMany = jest.fn().mockResolvedValue(undefined);
    const targetConnection = {
      model: jest.fn(() => ({ insertMany })),
    } as unknown as Connection;
    const getConnection = jest.fn().mockResolvedValue(targetConnection);
    const closeConnection = jest.fn().mockResolvedValue(undefined);

    await copyDatabase("mongodb://dest", { mainConnection, getConnection, closeConnection });

    expect(insertMany).toHaveBeenCalledTimes(2);
  });

  it("skips final batch insert when cursor aligns with batch size", async () => {
    const docs = Array.from({ length: 500 }, (_, index) => ({ _id: index }));
    const mainConnection = {
      model: jest.fn((name: string) => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            cursor: () => createCursor(name === "Account" ? docs : []),
          }),
        }),
      })),
    } as unknown as Connection;
    const insertMany = jest.fn().mockResolvedValue(undefined);
    const targetConnection = {
      model: jest.fn(() => ({ insertMany })),
    } as unknown as Connection;
    const getConnection = jest.fn().mockResolvedValue(targetConnection);
    const closeConnection = jest.fn().mockResolvedValue(undefined);

    await copyDatabase("mongodb://dest", { mainConnection, getConnection, closeConnection });

    expect(insertMany).toHaveBeenCalledTimes(1);
  });

  it("skips insertMany when cursor yields no documents", async () => {
    const mainConnection = {
      model: jest.fn(() => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            cursor: () => createCursor([]),
          }),
        }),
      })),
    } as unknown as Connection;
    const insertMany = jest.fn().mockResolvedValue(undefined);
    const targetConnection = {
      model: jest.fn(() => ({ insertMany })),
    } as unknown as Connection;
    const getConnection = jest.fn().mockResolvedValue(targetConnection);
    const closeConnection = jest.fn().mockResolvedValue(undefined);

    await copyDatabase("mongodb://dest", { mainConnection, getConnection, closeConnection });

    expect(insertMany).not.toHaveBeenCalled();
  });

  it("logs and continues when closeConnection fails", async () => {
    const mainConnection = {
      model: jest.fn(() => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      })),
    } as unknown as Connection;
    const insertMany = jest.fn();
    const targetConnection = {
      model: jest.fn(() => ({ insertMany })),
    } as unknown as Connection;
    const getConnection = jest.fn().mockResolvedValue(targetConnection);
    const closeConnection = jest.fn().mockRejectedValue(new Error("close fail"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await copyDatabase("mongodb://dest", { mainConnection, getConnection, closeConnection });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("throws when insertMany fails for a collection", async () => {
    const documentsByModel: Record<string, unknown[]> = {
      Account: [{ _id: "1" }],
      Seller: [],
      Tariff: [],
      TariffInbound: [],
      TariffSeller: [],
    };
    const mainConnection = {
      model: jest.fn((name: string) => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(documentsByModel[name] ?? []),
        }),
      })),
    } as unknown as Connection;
    const insertMany = jest.fn().mockRejectedValue(new Error("insert fail"));
    const targetConnection = {
      model: jest.fn(() => ({ insertMany })),
    } as unknown as Connection;
    const getConnection = jest.fn().mockResolvedValue(targetConnection);
    const closeConnection = jest.fn().mockResolvedValue(undefined);

    await expect(
      copyDatabase("mongodb://dest", { mainConnection, getConnection, closeConnection }),
    ).rejects.toThrow(/ناموفق/);
    expect(closeConnection).toHaveBeenCalledWith("mongodb://dest");
  });
});
