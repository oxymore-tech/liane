"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { type ReactNode, useState } from "react";
import { Button, Notice } from "./ui";

/** Boîte modale : focus piégé, fermeture par Échap, focus rendu à l'élément d'origine. */
export function Modal({
  open,
  onClose,
  title,
  alert = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Pour une action destructive : annoncée comme une alerte. */
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      role={alert ? "alertdialog" : "dialog"}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-4 sm:items-center"
    >
      <DialogBackdrop className="fixed inset-0 bg-encre/50" />
      <DialogPanel className="relative w-full max-w-md rounded-card border border-bordure bg-white p-5 text-encre">
        <DialogTitle className="text-xl font-extrabold">{title}</DialogTitle>
        {children}
      </DialogPanel>
    </Dialog>
  );
}

/**
 * Demande de confirmation. `onConfirm` fait l'action : le bouton montre qu'elle est en cours,
 * puis c'est à l'appelant de fermer la boîte.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive = false,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      alert={destructive}
    >
      {children && <div className="mt-2 flex flex-col gap-2">{children}</div>}
      {error && <Notice className="mt-3">{error}</Notice>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "primary"}
          loading={busy}
          onClick={confirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
