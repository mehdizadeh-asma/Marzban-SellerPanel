/// <reference types="jest" />

import type { Schema } from "mongoose";

const connectMainDatabase = jest.fn().mockResolvedValue(undefined);
const getMainConnection = jest.fn();

jest.mock("../../src/db/MongooseDbManagement", () => ({
  __esModule: true,
  default: {
    connectMainDatabase,
    getMainConnection,
  },
}));

const { getModel } = require("../../src/db/MongooseModel");

describe("MongooseModel getModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns existing model when present", async () => {
    const existingModel = { name: "Existing" };
    getMainConnection.mockReturnValue({
      models: { Test: existingModel },
      model: jest.fn(),
    });

    const result = await getModel("Test", {} as unknown as Schema);
    expect(connectMainDatabase).toHaveBeenCalled();
    expect(result).toBe(existingModel);
  });

  it("creates model when missing", async () => {
    const createFn = jest.fn().mockReturnValue({ name: "Created" });
    getMainConnection.mockReturnValue({
      models: {},
      model: createFn,
    });

    const result = await getModel("NewModel", {} as unknown as Schema);
    expect(createFn).toHaveBeenCalledWith("NewModel", {});
    expect(result).toEqual({ name: "Created" });
  });

  it("throws when connection is not available", async () => {
    getMainConnection.mockReturnValue(null);
    await expect(getModel("X", {} as unknown as Schema)).rejects.toThrow(
      "Database connection error",
    );
  });
});
