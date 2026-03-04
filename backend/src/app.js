import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";

import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import goalRouter from "./modules/goals/goal.routes.js";
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import holdingRouter from "./modules/holdings/holding.routes.js";
import brokerRouter from "./modules/brokers/broker.routes.js";
import hdfcRouter from "./modules/brokers/hdfc_investright/hdfc.routes.js";
import portfolioRouter from "./modules/portfolio/portfolio.routes.js";
import fixedDepositRouter from "./modules/fixedDeposits/fixedDeposit.routes.js";
import epfRouter from "./modules/epf/epf.routes.js";
import npsRouter from "./modules/nps/nps.routes.js";
import ppfRouter from "./modules/ppf/ppf.routes.js";
import physicalCommodityRouter from "./modules/physicalCommodities/physicalCommodity.routes.js";
import settingsRouter from "./modules/settings/settings.routes.js";
import backupRouter from "./modules/backup/backup.routes.js";
import auditLogRouter from "./modules/auditLogs/auditLog.routes.js";
import cashAccountRouter from "./routes/cashAccounts.js";
import liabilityRouter from "./routes/liabilities.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use(healthRouter);
app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api/goals", goalRouter);
app.use("/api/holdings", holdingRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/brokers/hdfc_investright", hdfcRouter);
app.use("/api/brokers", brokerRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/fixed-deposits", fixedDepositRouter);
app.use("/api/epf", epfRouter);
app.use("/api/nps", npsRouter);
app.use("/api/ppf", ppfRouter);
app.use("/api/physical-commodities", physicalCommodityRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/backup", backupRouter);
app.use("/api/audit-logs", auditLogRouter);
app.use("/api/cash-accounts", cashAccountRouter);
app.use("/api/liabilities", liabilityRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
