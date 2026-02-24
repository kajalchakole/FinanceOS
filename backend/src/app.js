import express from "express";
import cors from "cors";
import morgan from "morgan";

import healthRouter from "./routes/health.routes.js";
import goalRouter from "./modules/goals/goal.routes.js";
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import holdingRouter from "./modules/holdings/holding.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(healthRouter);
app.use("/api/goals", goalRouter);
app.use("/api/holdings", holdingRouter);
app.use("/api/dashboard", dashboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
