import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import api from "../services/api";

const getBackendBaseUrl = () => {
  const baseUrl = api.defaults.baseURL || "http://localhost:5000/api";
  return baseUrl.replace(/\/api$/, "");
};

const getConnectUrl = (brokerName) => `${getBackendBaseUrl()}/api/brokers/${brokerName}/connect`;

function BrokerSyncDrawer({
  isOpen,
  brokers,
  onClose,
  onSyncSuccess,
  onRefreshBrokers
}) {
  const [brokerUiState, setBrokerUiState] = useState({});
  const [genericImportState, setGenericImportState] = useState({
    file: null,
    headers: [],
    mapping: {},
    isParsing: false,
    isImporting: false,
    error: ""
  });
  const fileInputRefs = useRef({});
  const genericFileInputRef = useRef(null);

  const genericColumnFields = [
    { key: "broker", label: "Broker", required: true, aliases: ["broker"] },
    { key: "instrument_name", label: "Instrument Name", required: true, aliases: ["instrument_name", "instrument name", "name"] },
    { key: "quantity", label: "Quantity", required: true, aliases: ["quantity", "qty", "units"] },
    { key: "average_price", label: "Average Price", required: false, aliases: ["average_price", "average price", "avg price"] },
    { key: "current_price", label: "Current Price", required: false, aliases: ["current_price", "current price", "price", "ltp"] },
    { key: "instrument_type", label: "Instrument Type", required: false, aliases: ["instrument_type", "instrument type", "type"] }
  ];

  const stateByBroker = useMemo(() => (
    brokers.reduce((accumulator, broker) => {
      accumulator[broker.name] = brokerUiState[broker.name] || { mode: "idle", message: "" };
      return accumulator;
    }, {})
  ), [brokerUiState, brokers]);

  if (!isOpen) {
    return null;
  }

  const setUiState = (brokerName, nextState) => {
    setBrokerUiState((current) => ({
      ...current,
      [brokerName]: nextState
    }));
  };

  const toNormalized = (value) => String(value || "").trim().toLowerCase();

  const getDefaultGenericMapping = (headers) => {
    const normalizedByHeader = headers.reduce((accumulator, header) => {
      accumulator[toNormalized(header)] = header;
      return accumulator;
    }, {});

    return genericColumnFields.reduce((accumulator, field) => {
      const matchedAlias = field.aliases.find((alias) => normalizedByHeader[toNormalized(alias)]);
      if (matchedAlias) {
        accumulator[field.key] = normalizedByHeader[toNormalized(matchedAlias)];
      }
      return accumulator;
    }, {});
  };

  const parseHeadersFromFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const rows = firstSheetName
      ? XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, defval: "" })
      : [];
    const firstRow = Array.isArray(rows[0]) ? rows[0] : [];

    return firstRow
      .map((header) => String(header || "").trim())
      .filter(Boolean);
  };

  const handleGenericFileSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setGenericImportState({
      file,
      headers: [],
      mapping: {},
      isParsing: true,
      isImporting: false,
      error: ""
    });

    try {
      const headers = await parseHeadersFromFile(file);
      const mapping = getDefaultGenericMapping(headers);

      setGenericImportState({
        file,
        headers,
        mapping,
        isParsing: false,
        isImporting: false,
        error: ""
      });
    } catch (requestError) {
      setGenericImportState({
        file: null,
        headers: [],
        mapping: {},
        isParsing: false,
        isImporting: false,
        error: requestError?.message || "Unable to parse file headers."
      });
    }
  };

  const handleGenericMappingChange = (fieldKey, header) => {
    setGenericImportState((current) => ({
      ...current,
      mapping: {
        ...current.mapping,
        [fieldKey]: header
      }
    }));
  };

  const handleGenericImport = async () => {
    const { file, mapping } = genericImportState;

    if (!file) {
      setGenericImportState((current) => ({
        ...current,
        error: "Please upload a file."
      }));
      return;
    }

    const missingRequiredFields = genericColumnFields
      .filter((field) => field.required)
      .filter((field) => !mapping[field.key]);

    if (missingRequiredFields.length > 0) {
      setGenericImportState((current) => ({
        ...current,
        error: "Map all required columns before importing."
      }));
      return;
    }

    setGenericImportState((current) => ({
      ...current,
      isImporting: true,
      error: ""
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));

      const response = await api.post("/import/generic", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setGenericImportState({
        file: null,
        headers: [],
        mapping: {},
        isParsing: false,
        isImporting: false,
        error: ""
      });

      await onSyncSuccess(`Generic portfolio import successful (${response.data?.importedCount || 0} holdings)`);
      await onRefreshBrokers();
      onClose();
    } catch (requestError) {
      setGenericImportState((current) => ({
        ...current,
        isImporting: false,
        error: requestError.response?.data?.message || "Generic portfolio import failed."
      }));
    }
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return "Never";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Never";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const connectBroker = (brokerName) => {
    window.location.href = getConnectUrl(brokerName);
  };

  const isFileImportBroker = (brokerName) => (
    brokerName === "groww" || brokerName === "indmoney" || brokerName === "icici_mf"
  );

  const handleSyncAction = async (broker) => {
    setUiState(broker.name, { mode: "syncing", message: "" });

    try {
      await api.post(`/brokers/${broker.name}/sync`);
      setUiState(broker.name, { mode: "idle", message: "" });
      await onSyncSuccess(`${broker.displayName || broker.name} sync completed`);
      await onRefreshBrokers();
      onClose();
    } catch (requestError) {
      const status = requestError.response?.status;
      const code = requestError.response?.data?.code;
      const message = requestError.response?.data?.message || "Sync failed";

      if (status === 401 || code === "BROKER_SESSION_EXPIRED") {
        setUiState(broker.name, { mode: "expired", message: "Session expired. Please reconnect." });
        return;
      }

      if (status === 400 || code === "BROKER_NOT_CONNECTED") {
        setUiState(broker.name, { mode: "not_connected", message });
        return;
      }

      if (status === 400 && code === "BROKER_NOT_SUPPORTED") {
        setUiState(broker.name, {
          mode: "failed",
          message
        });
        return;
      }

      setUiState(broker.name, { mode: "failed", message: requestError.response?.data?.message || "Sync failed. Try again." });
    }
  };

  const handleFileImport = async (files, broker) => {
    const selectedFiles = Array.from(files || []);

    if (selectedFiles.length === 0) {
      setUiState(broker.name, { mode: "failed", message: "Select at least one file to import." });
      return;
    }

    setUiState(broker.name, { mode: "syncing", message: "" });

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await api.post(`/brokers/${broker.name}/import`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setUiState(broker.name, { mode: "idle", message: "" });
      const successMessage = `${broker.displayName || broker.name} import successful (${response.data?.importedCount || 0} holdings)`;
      await onSyncSuccess(successMessage);
      await onRefreshBrokers();
      onClose();
    } catch (requestError) {
      const details = requestError.response?.data;
      const fileErrors = (details?.byFile || [])
        .filter((entry) => entry?.error)
        .map((entry) => `${entry.filename}: ${entry.error}`);

      const message = fileErrors.length > 0
        ? fileErrors.join(" | ")
        : details?.fileError || details?.message || "Import failed. Please check your files and try again.";

      setUiState(broker.name, { mode: "failed", message });
    }
  };

  const getSyncButtonLabel = (broker) => {
    const brokerState = stateByBroker[broker.name] || { mode: "idle" };

    if (brokerState.mode === "syncing") {
      return "Syncing...";
    }

    if (brokerState.mode === "failed") {
      return "Try Again";
    }

    return "Sync Now";
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
      <button
        type="button"
        onClick={onClose}
        className="h-full flex-1 cursor-default"
        aria-label="Close broker sync drawer backdrop"
      />

      <aside className="flex h-full w-full max-w-md flex-col border-l border-brand-line bg-slate-100 p-4 shadow-soft sm:p-6">
        <div className="flex shrink-0 items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-brand-text">Broker Sync Center</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex-1 space-y-4 overflow-y-auto pb-6 pr-1">
          {brokers.map((broker) => {
            const brokerState = stateByBroker[broker.name] || { mode: "idle", message: "" };
            const shouldShowConnectOnly = !broker.connected || brokerState.mode === "expired" || brokerState.mode === "not_connected";

            return (
              <article key={broker.name} className="rounded-2xl border border-brand-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-text">{broker.displayName || broker.name}</p>
                    <p className="mt-1 text-xs text-brand-muted">
                      Status: {broker.connected ? "Connected" : "Not Connected"}
                    </p>
                    <p className="mt-1 text-xs text-brand-muted">Last Sync: {formatDateTime(broker.lastSyncAt)}</p>
                    <p className="mt-1 text-xs text-brand-muted">Holdings: {broker.holdingsCount}</p>
                    {brokerState.message ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">{brokerState.message}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    {isFileImportBroker(broker.name) ? (
                      <>
                        <p className="text-[11px] font-medium text-brand-muted">Import via File</p>
                        <input
                          ref={(node) => {
                            fileInputRefs.current[broker.name] = node;
                          }}
                          type="file"
                          accept=".csv,.xls,.xlsx"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            handleFileImport(event.target.files, broker);
                            event.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          disabled={brokerState.mode === "syncing"}
                          onClick={() => fileInputRefs.current[broker.name]?.click()}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {brokerState.mode === "syncing" ? "Importing..." : broker.name === "icici_mf" ? "Upload Holdings" : "Import File"}
                        </button>
                      </>
                    ) : shouldShowConnectOnly ? (
                      <button
                        type="button"
                        onClick={() => connectBroker(broker.name)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        {broker.connected ? "Reconnect" : "Connect"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSyncAction(broker)}
                          disabled={brokerState.mode === "syncing"}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {getSyncButtonLabel(broker)}
                        </button>
                        <button
                          type="button"
                          onClick={() => connectBroker(broker.name)}
                          className="rounded-xl border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-muted transition hover:bg-slate-50"
                        >
                          Reconnect
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          <article className="rounded-2xl border border-brand-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-text">Generic Portfolio Import</p>
                <p className="mt-1 text-xs text-brand-muted">Import holdings from any broker using CSV or Excel files.</p>
                {genericImportState.file ? (
                  <p className="mt-2 text-xs font-medium text-brand-text">Selected: {genericImportState.file.name}</p>
                ) : null}
                {genericImportState.error ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">{genericImportState.error}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={genericFileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={handleGenericFileSelect}
                />
                <button
                  type="button"
                  disabled={genericImportState.isParsing || genericImportState.isImporting}
                  onClick={() => genericFileInputRef.current?.click()}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {genericImportState.isParsing ? "Reading..." : "Upload File"}
                </button>
              </div>
            </div>

            {genericImportState.headers.length > 0 ? (
              <div className="mt-4 space-y-3">
                {genericColumnFields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="text-xs font-medium text-brand-muted">
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                    <select
                      value={genericImportState.mapping[field.key] || ""}
                      onChange={(event) => handleGenericMappingChange(field.key, event.target.value)}
                      className="mt-1 w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-text focus:border-slate-400 focus:outline-none"
                    >
                      <option value="">{field.required ? "Select column" : "Skip"}</option>
                      {genericImportState.headers.map((header) => (
                        <option key={`${field.key}-${header}`} value={header}>{header}</option>
                      ))}
                    </select>
                  </label>
                ))}

                <button
                  type="button"
                  onClick={handleGenericImport}
                  disabled={genericImportState.isImporting || genericImportState.isParsing}
                  className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {genericImportState.isImporting ? "Importing..." : "Import Holdings"}
                </button>
              </div>
            ) : null}
          </article>
        </div>
      </aside>
    </div>
  );
}

export default BrokerSyncDrawer;
