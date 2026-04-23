import type { PrintJobPayload } from "@hull-eats/types";

import type { PrintResult, PrinterAdapter, PrinterConnection, PrinterRegistry } from "./contracts";

export class MockPrinterAdapter implements PrinterAdapter {
  readonly type = "mock" as const;

  async printOrderSlip(connection: PrinterConnection, payload: PrintJobPayload): Promise<PrintResult> {
    const preview = [
      `Printer: ${connection.name}`,
      `Order: ${payload.orderNumber}`,
      `Customer: ${payload.customerName}`,
      ...payload.lines.map((line) => `${line.quantity} x ${line.name}`),
    ].join("\n");

    return {
      success: true,
      externalReference: `mock-${payload.orderId}`,
      preview,
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message: "Mock printer is available",
    };
  }
}

export class InMemoryPrinterRegistry implements PrinterRegistry {
  private readonly adapters = new Map<string, PrinterAdapter>();

  register(adapter: PrinterAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  resolve(adapterType: PrinterConnection["adapterType"]): PrinterAdapter {
    const adapter = this.adapters.get(adapterType);

    if (!adapter) {
      throw new Error(`No printer adapter registered for ${adapterType}`);
    }

    return adapter;
  }
}

