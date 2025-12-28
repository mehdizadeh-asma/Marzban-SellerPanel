import type { Connection, Model } from "mongoose";

import type { IAccount } from "../models/Account";
import { AccountSchema } from "../models/Account";
import type { ISeller } from "../models/Seller";
import { SellerSchema } from "../models/Seller";
import type { ITariff } from "../models/Tariff";
import { TariffSchema } from "../models/Tariff";
import type { ITariffInbound } from "../models/TariffInbound";
import { TariffInboundSchema } from "../models/TariffInbound";
import type { ITariffSeller } from "../models/TariffSeller";
import { TariffSellerSchema } from "../models/TariffSeller";

type CopyDependencies = {
  mainConnection: Connection | null;
  getConnection: (_connectionString: string) => Promise<Connection>;
  closeConnection: (_connectionString: string) => Promise<void>;
};

export const copyDatabase = async (
  destinationConnectionString: string,
  deps: CopyDependencies,
): Promise<void> => {
  if (!deps.mainConnection) {
    throw new Error("اتصال به دیتابیس اصلی برقرار نشده است");
  }

  const targetConnection = await deps.getConnection(destinationConnectionString);

  try {
    console.log("شروع فرآیند کپی دیتابیس...");

    await copyCollection<IAccount>(
      deps.mainConnection.model<IAccount>("Account", AccountSchema),
      targetConnection.model<IAccount>("Account", AccountSchema),
      "Accounts",
    );

    await copyCollection<ISeller>(
      deps.mainConnection.model<ISeller>("Seller", SellerSchema),
      targetConnection.model<ISeller>("Seller", SellerSchema),
      "Sellers",
    );

    await copyCollection<ITariff>(
      deps.mainConnection.model<ITariff>("Tariff", TariffSchema),
      targetConnection.model<ITariff>("Tariff", TariffSchema),
      "Tariffs",
    );

    await copyCollection<ITariffInbound>(
      deps.mainConnection.model<ITariffInbound>("TariffInbound", TariffInboundSchema),
      targetConnection.model<ITariffInbound>("TariffInbound", TariffInboundSchema),
      "TariffInbounds",
    );

    await copyCollection<ITariffSeller>(
      deps.mainConnection.model<ITariffSeller>("TariffSeller", TariffSellerSchema),
      targetConnection.model<ITariffSeller>("TariffSeller", TariffSellerSchema),
      "TariffSellers",
    );

    console.log("کپی دیتابیس با موفقیت انجام شد");
  } finally {
    try {
      await deps.closeConnection(destinationConnectionString);
    } catch (closeError) {
      console.error("Failed to close copy database connection:", closeError);
    }
  }
};

const copyCollection = async <TRawDocType>(
  sourceModel: Model<TRawDocType>,
  targetModel: Model<TRawDocType>,
  collectionName: string,
): Promise<void> => {
  console.log(`در حال کپی‌کردن ${collectionName}...`);

  const BATCH_SIZE = 500;
  const insertBatch = async (batch: TRawDocType[], totalCount?: number): Promise<void> => {
    try {
      await targetModel.insertMany(batch, { ordered: false });
      if (typeof totalCount === "number") {
        console.log(`تعداد ${totalCount} سند در ${collectionName} کپی شد`);
      }
    } catch (insertError) {
      console.error(`خطا در کپی ${collectionName}:`, insertError);
      throw new Error(`کپی ${collectionName} ناموفق بود`);
    }
  };

  const query = sourceModel.find().lean() as unknown as {
    cursor?: () => AsyncIterable<TRawDocType>;
  };

  if (typeof query.cursor === "function") {
    const cursor = query.cursor();
    let batch: TRawDocType[] = [];
    let total = 0;

    for await (const doc of cursor) {
      batch.push(doc);
      total += 1;
      if (batch.length >= BATCH_SIZE) {
        await insertBatch(batch);
        batch = [];
      }
    }

    if (total === 0) {
      console.log(`هیچ سندی در ${collectionName} یافت نشد`);
      return;
    }

    if (batch.length > 0) {
      await insertBatch(batch);
    }

    console.log(`تعداد ${total} سند در ${collectionName} کپی شد`);
    return;
  }

  const documents = await (query as unknown as Promise<TRawDocType[]>);
  if (documents.length === 0) {
    console.log(`هیچ سندی در ${collectionName} یافت نشد`);
    return;
  }
  await insertBatch(documents, documents.length);
};
