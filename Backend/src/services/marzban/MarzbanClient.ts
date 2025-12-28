import type { AxiosResponse } from "axios";
import axios from "axios";

import ConfigFile from "../../config/Config";
import type MarzbanAccount from "../../models/MarzbanAccount";
import type { ISeller } from "../../models/Seller";
import { CryptoService } from "../security/CryptoService";

export const getInbounds = async (
  authorization: string | undefined,
): Promise<{ InboundType: string; InboundTag: string }[]> => {
  const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/inbounds";

  const result = await axios.get(apiURL, {
    headers: { Authorization: authorization },
  });
  if (result && result.status == 200) {
    const inbounds = result.data as {
      vmess: { tag: string }[];
      vless: { tag: string }[];
      trojan: { tag: string }[];
      shadowsocks: { tag: string }[];
    };

    const formattedInbounds = Object.entries(inbounds).flatMap(([inboundType, inboundTags]) =>
      inboundTags.map(({ tag }) => ({
        InboundType: inboundType,
        InboundTag: tag,
      })),
    );

    return formattedInbounds;
  }
  throw new Error("No Inbound Found!!");
};

export const loginToMarzban = async (username: string, password: string): Promise<string> => {
  const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/admin/token";

  const config = {
    headers: { "content-type": "application/x-www-form-urlencoded" },
  };

  const resultLogin = await axios.post(
    apiURL,
    {
      username: username,
      password: password,
    },
    config,
  );
  return (resultLogin.data as { access_token: string }).access_token;
};

export const validateMarzbanCredentials = async (
  username: string,
  password: string,
): Promise<void> => {
  try {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/admin/token";
    const config = {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    };
    await axios.post(
      apiURL,
      {
        username,
        password,
      },
      config,
    );
  } catch {
    throw new Error("Invalid Marzban Account Information");
  }
};

export const checkToken = async (authorization?: string): Promise<boolean> => {
  try {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/admin";

    const config = {
      headers: { Authorization: authorization },
      params: {},
    };

    const resultMarzban = await axios.get(apiURL, config);

    return resultMarzban.status === 200;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getSellerMarzbanPassword = async (seller: ISeller): Promise<string> => {
  return CryptoService.decrypt(seller.MarzbanPassword);
};

export const getMarzbanAccounts = async (
  authorization: string | undefined,
  seller: ISeller | undefined,
  search = "",
): Promise<AxiosResponse> => {
  const startTime = Date.now();
  const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/users";
  const params = { search: "" };

  if (seller) {
    const getAllUsersForAgent = await ConfigFile.GetAllUsersForAgent();
    if (getAllUsersForAgent === "Yes") {
      const marzbanPassword = await getSellerMarzbanPassword(seller);
      const token = await loginToMarzban(seller.MarzbanUsername, marzbanPassword);
      authorization = "Bearer " + token;
    } else {
      params.search = seller.Title;
    }
  }

  if (search != "") params.search = search;

  const config = {
    headers: { Authorization: authorization },
    params: params,
    timeout: 300000,
  };
  const response = await axios.get(apiURL, config);
  const durationMs = Date.now() - startTime;
  console.log(
    `[GetMarzbanAccounts] seller=${seller?.Title ?? "none"} search=${search || ""} duration_ms=${durationMs}`,
  );
  return response;
};

export const getMarzbanAccountByUsername = async (
  authorization: string | undefined,
  seller: ISeller,
  username: string,
): Promise<MarzbanAccount | null> => {
  const response = await getMarzbanAccounts(authorization, seller, username);
  const users = (response.data as { users?: MarzbanAccount[] }).users || [];
  const matched = users.find((user) => user.username === username);
  return matched || null;
};
