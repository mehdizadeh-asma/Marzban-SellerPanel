jest.mock("../../src/utils/MongooseDbManagement", () => ({
  __esModule: true,
  default: {
    connectMainDatabase: jest.fn().mockResolvedValue(undefined),
    getMainConnection: jest
      .fn()
      .mockReturnValue({ models: {}, model: jest.fn((n: string) => ({ name: n })) }),
  },
}));

const { getModel } = require("../../src/utils/MongooseModel");

describe("MongooseModel getModel", () => {
  it("should return model from connection models or create a new one", async () => {
    const m = await getModel("Test", {} as unknown as Record<string, unknown>);
    expect(m).toBeDefined();
  });
});
