import { useCallback, useEffect, useMemo, useState } from "react";

import { backupApi } from "../services/api";

export function useBackupStatus() {
  const [backupStatus, setBackupStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await backupApi.status();
      setBackupStatus(response.data || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load backup status");
      setBackupStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lastBackupText = useMemo(() => {
    if (!backupStatus) {
      return "Last Backup: --";
    }

    if (!backupStatus.lastBackupAt) {
      return "Last Backup: Never";
    }

    const days = Number(backupStatus.daysSinceLastBackup || 0);
    return `Last Backup: ${days} day${days === 1 ? "" : "s"} ago`;
  }, [backupStatus]);

  const health = useMemo(() => {
    if (!backupStatus || !backupStatus.backupEnabled) {
      return null;
    }

    const intervalDays = Number(backupStatus.backupIntervalDays || 0);
    const daysSince = backupStatus.daysSinceLastBackup;

    if (!backupStatus.lastBackupAt) {
      return {
        severity: "warning",
        message: "Backup overdue. Auto backup is enabled, but no backups exist yet."
      };
    }

    if (Number.isFinite(daysSince) && intervalDays > 0) {
      if (daysSince > intervalDays * 2) {
        return {
          severity: "critical",
          message: `Backup critically overdue. Last backup was ${daysSince} days ago (interval ${intervalDays} days).`
        };
      }

      if (daysSince > intervalDays) {
        return {
          severity: "warning",
          message: `Backup overdue. Last backup was ${daysSince} days ago (interval ${intervalDays} days).`
        };
      }
    }

    return null;
  }, [backupStatus]);

  return {
    backupStatus,
    isLoading,
    error,
    lastBackupText,
    health,
    refresh
  };
}
