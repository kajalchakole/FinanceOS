import dotenv from "dotenv";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startBackupJob } from "./jobs/backupJob.js";
import { migrateLegacyIdentityToUsername } from "./modules/auth/auth.migration.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await migrateLegacyIdentityToUsername();
    app.listen(PORT, () => {
      startBackupJob();
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
