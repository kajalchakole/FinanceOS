import React, { useEffect, useRef } from "react";

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isProcessing = false,
  errorMessage = "",
  variant = "primary",
  ariaLabelledBy
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const modalElement = modalRef.current;
    if (modalElement) {
      const initialFocusElement = modalElement.querySelector("button");
      initialFocusElement?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isProcessing) {
          onCancel();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) {
    return null;
  }

  const confirmButtonClassName = variant === "danger"
    ? "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft"
      >
        <h3 id={ariaLabelledBy} className="text-lg font-semibold tracking-tight text-brand-text">{title}</h3>
        <p className="mt-2 text-sm text-brand-muted">{message}</p>

        {errorMessage ? <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-muted transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={confirmButtonClassName}
          >
            {isProcessing ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
