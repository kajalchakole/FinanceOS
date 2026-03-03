import { Router } from "express";

import { getAuditLogs } from "./auditLog.controller.js";

const auditLogRouter = Router();

auditLogRouter.get("/", getAuditLogs);

export default auditLogRouter;
