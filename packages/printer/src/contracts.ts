import type { PrintJobPayload, PrinterAdapterType } from "@hull-eats/types";

export type PrinterConnection = {
  id: string;
  storeId: string;
  name: string;
  adapterType: PrinterAdapterType;
  config: Record<string, unknown>;
};

export type PrintResult = {
  success: boolean;
  externalReference?: string;
  error?: string;
  preview?: string;
};

export interface PrinterAdapter {
  readonly type: PrinterAdapterType;
  printOrderSlip(connection: PrinterConnection, payload: PrintJobPayload): Promise<PrintResult>;
  healthCheck(connection: PrinterConnection): Promise<{ ok: boolean; message: string }>;
}

export interface PrinterRegistry {
  register(adapter: PrinterAdapter): void;
  resolve(adapterType: PrinterAdapterType): PrinterAdapter;
}

