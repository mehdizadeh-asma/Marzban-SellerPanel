import express, {
  NextFunction,
  Request,
  Response,
  ErrorRequestHandler,
} from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import https from "https";

import marzbanRouter from "./routes/MarzbanRouter";
import sellerRouter from "./routes/SellerRouter";
import tariffRouter from "./routes/TariffRouter";
import accountRouter from "./routes/AccountRouter";
import tariffSellerRouter from "./routes/TariffSellerRouter";
import tariffInboundRouter from "./routes/TariffInboundRouter";

import Certificate from "./utils/Certificate";
import Mongoose from "./utils/Mongoose";

const app = express();

const credentials = Certificate.GetCredential();

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

app.use(bodyParser.json());

const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};

app.use("/api/marzban", cors(corsOptions), marzbanRouter);

app.use("/api", cors(corsOptions), sellerRouter);

app.use("/api", cors(corsOptions), tariffRouter);

app.use("/api", cors(corsOptions), accountRouter);

app.use("/api", cors(corsOptions), tariffSellerRouter);

app.use("/api", cors(corsOptions), tariffInboundRouter);

app.use(
  (
    err: ErrorRequestHandler,
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.log(err); //replace with logger later
    if (res.headersSent) {
      return next(err);
    }
    res.status(500);
    res.json(err.toString());
  }
);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "app is running!" });
});

const Connecting = async () => {
  try {
    const isValidLicense = await Mongoose.CheckLicense();

    if (isValidLicense && (await Mongoose.ConnectDbWholeSaler())) {
      // console.log("Copy Database....");
      // await Mongoose.CopyDatabase(
      //   "mongodb+srv://djabbas:fgghjh@cluster0.mhkwq.mongodb.net/Deejayabbas?retryWrites=true&w=majority&appName=Deejayabbas"
      // );

      httpServer.listen(8080);
      httpsServer.listen(8443);
      console.log("Server is Startig at http://localhost:8080");
      console.log("Server is Startig at https://localhost:8443");
    } else console.log("License is not Available or Expired!");
  } catch (err) {
    console.log(`MongoDb Connection :  ${err}`);
  }
};

Connecting();
