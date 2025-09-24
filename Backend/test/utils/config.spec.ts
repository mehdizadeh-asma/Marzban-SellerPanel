import fs from "fs";
import ConfigFile from "../../src/utils/Config";

jest.mock("fs", () => ({ promises: { readFile: jest.fn() } }));

describe("Config utils", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should load config from file and expose getters returning correct values", async () => {
    const data = JSON.stringify({
      MARZBAN_URL: "http://m",
      SUBSCRIPTION_URL: "s",
      SUDO_MARZBAN_USERNAME: "u",
      SUDO_MARZBAN_PASSWORD: "p",
      MARZBAN_FLOW: "none",
      SELLER_ADMIN_USERNAME: "a",
      SELLER_ADMIN_PASSWORD: "b",
      IGNORE_TRAFFIC_TO_REMOVE: "1",
      GET_ALL_USERS_FOR_AGENT: "No",
      DELETE_PAIDANDREMOVED_USERS: "No",
      RENEW_FORCE_TO_PAID: "Yes",
      RENEW_FORCE_TO_LIMITED_AND_EXPIRED: "Yes",
      SERIALKEY: "sn",
    });
    (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(data);
    await ConfigFile.GetConfigFromFile();
    expect(await ConfigFile.GetMarzbanURL()).toBe("http://m");
    expect(await ConfigFile.GetSubscriptionURL()).toBe("s");
    expect(await ConfigFile.GetMarzbanUsername()).toBe("u");
    expect(await ConfigFile.GetMarzbanPassword()).toBe("p");
  });
});
