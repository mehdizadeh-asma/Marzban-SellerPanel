export type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
};

export const mockResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.status = jest.fn().mockReturnValue(res as unknown as MockResponse);
  res.json = jest.fn().mockReturnValue(res as unknown as MockResponse);
  res.send = jest.fn().mockReturnValue(res as unknown as MockResponse);
  return res as MockResponse;
};

export const mockNext = (): jest.Mock => jest.fn();

type CreateModelOverrides = {
  find?: unknown;
  findOne?: unknown;
  findById?: unknown;
  findByIdAndUpdate?: unknown;
  deleteOne?: unknown;
  deleteMany?: unknown;
  save?: unknown;
  insertMany?: unknown;
};

export const createModelMock = (overrides: CreateModelOverrides = {}) => {
  return {
    find: jest.fn().mockResolvedValue(overrides.find ?? []),
    findOne: jest.fn().mockResolvedValue(overrides.findOne ?? null),
    findById: jest.fn().mockResolvedValue(overrides.findById ?? null),
    findByIdAndUpdate: jest.fn().mockResolvedValue(overrides.findByIdAndUpdate ?? null),
    deleteOne: jest.fn().mockResolvedValue(overrides.deleteOne ?? { deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue(overrides.deleteMany ?? { deletedCount: 1 }),
    save: jest.fn().mockResolvedValue(overrides.save ?? {}),
    insertMany: jest.fn().mockResolvedValue(overrides.insertMany ?? []),
  };
};

import { expect as jestExpect } from "@jest/globals";

const testPath =
  jestExpect && (jestExpect as unknown as { getState?: () => { testPath?: string } }).getState
    ? (jestExpect as unknown as { getState: () => { testPath?: string } }).getState().testPath
    : "";
const isControllerTest =
  typeof testPath === "string" && /[\\/]test[\\/]controllers[\\/]/.test(testPath);

if (isControllerTest) {
  jest.mock("./src/utils/MongooseModel", () => ({
    __esModule: true,
    getModel: jest.fn(() => ({
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      save: jest.fn(),
      insertMany: jest.fn(),
    })),
  }));

  jest.mock("axios", () => ({
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  }));

  jest.mock("./src/utils/Config", () => ({
    __esModule: true,
    default: {
      GetMarzbanURL: jest.fn().mockResolvedValue("http://marzban.test"),
      GetMarzbanUsername: jest.fn().mockResolvedValue("marz_user"),
      GetMarzbanPassword: jest.fn().mockResolvedValue("marz_pass"),
      GetSellerAdminUsername: jest.fn().mockResolvedValue("admin"),
      GetSellerAdminPassword: jest.fn().mockResolvedValue("pass"),
      GetDeletePaidAndRemovedUsers: jest.fn().mockResolvedValue("No"),
      GetSubscriptionURL: jest.fn().mockResolvedValue("http://sub.test"),
      GetAllUsersForAgent: jest.fn().mockResolvedValue("No"),
      GetMarzbanFlow: jest.fn().mockResolvedValue("none"),
    },
  }));

  jest.mock("./src/utils/MongooseDbManagement", () => ({
    __esModule: true,
    default: {
      checkLicense: jest.fn().mockResolvedValue(true),
    },
  }));

  jest.mock("./src/utils/AccountHelpers", () => ({
    __esModule: true,
    default: {
      LoginToMarzban: jest.fn(),
      GetTotalUnpaid: jest.fn(),
      GetAccountsSmart: jest.fn(),
      NormalizeAccountOutput: jest.fn(),
      GetMarzbanAccounts: jest.fn(),
      GetMixedAccount: jest.fn(),
      GetUsernameAvailable: jest.fn(),
      GenerateProxiesAndInbounds: jest.fn(),
      InvalidateSellerAllCache: jest.fn(),
      CheckToken: jest.fn(),
      GetInbounds: jest.fn(),
      RemoveDeletedAccountSeller: jest.fn(),
      GetSubscriptionUrl: jest.fn(),
    },
  }));

  jest.requireMock("./src/utils/MongooseDbManagement").checkLicense = jest.requireMock(
    "./src/utils/MongooseDbManagement",
  ).default.checkLicense;

  jest.mock("uuid", () => ({
    __esModule: true,
    v4: () => "00000000-0000-0000-0000-000000000000",
  }));
} else {
  jest.mock("uuid", () => ({
    __esModule: true,
    v4: () => "00000000-0000-0000-0000-000000000000",
  }));
}

type ConfigMock = Partial<Record<string, jest.Mock>>;

export const mockConfigDefaults = (overrides: ConfigMock = {}) => {
  const cf = jest.requireMock("./src/utils/Config");
  if (!cf || !cf.default) throw new Error("Config mock not found");
  const defaultValues: ConfigMock = {
    GetMarzbanURL: jest.fn().mockResolvedValue("http://marzban.test"),
    GetMarzbanUsername: jest.fn().mockResolvedValue("marz_user"),
    GetMarzbanPassword: jest.fn().mockResolvedValue("marz_pass"),
    GetSellerAdminUsername: jest.fn().mockResolvedValue("admin"),
    GetSellerAdminPassword: jest.fn().mockResolvedValue("pass"),
    GetDeletePaidAndRemovedUsers: jest.fn().mockResolvedValue("No"),
    GetSubscriptionURL: jest.fn().mockResolvedValue("http://sub.test"),
    GetAllUsersForAgent: jest.fn().mockResolvedValue("No"),
    GetMarzbanFlow: jest.fn().mockResolvedValue("none"),
  };

  const dv = defaultValues as unknown as Record<string, jest.Mock>;
  Object.keys(dv).forEach((k) => (cf.default[k] = dv[k]));

  const ov = overrides as unknown as Record<string, jest.Mock>;
  Object.keys(ov).forEach((k) => {
    cf.default[k] = ov[k];
  });

  return cf.default as Record<string, unknown> & ConfigMock;
};

export const resetAllMocks = () => jest.resetAllMocks();

// Silence console output during tests to keep CI logs clean.
const _console = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
});

afterAll(() => {
  console.log = _console.log;
  console.error = _console.error;
  console.warn = _console.warn;
  console.info = _console.info;
});
