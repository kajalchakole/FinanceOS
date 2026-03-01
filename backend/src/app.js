import express from "express";
import cors from "cors";
import morgan from "morgan";

import healthRouter from "./routes/health.routes.js";
import goalRouter from "./modules/goals/goal.routes.js";
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import holdingRouter from "./modules/holdings/holding.routes.js";
import brokerRouter from "./modules/brokers/broker.routes.js";
import hdfcRouter from "./modules/brokers/hdfc_investright/hdfc.routes.js";
import growwImportRouter from "./modules/brokers/groww_import/growwImport.routes.js";
import portfolioRouter from "./modules/portfolio/portfolio.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(healthRouter);
app.use("/api/goals", goalRouter);
app.use("/api/holdings", holdingRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/brokers/hdfc_investright", hdfcRouter);
app.use("/api/brokers/groww", growwImportRouter);
app.use("/api/brokers", brokerRouter);
app.use("/api/portfolio", portfolioRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
