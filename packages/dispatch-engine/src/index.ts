import type { DeliveryStatus } from "@hull-eats/types";

export type DriverCandidate = {
  courierProfileId: string;
  isActive: boolean;
  currentDeliveryCount: number;
  zoneIds: string[];
};

export type ManualAssignmentRequest = {
  orderId: string;
  deliveryZoneId?: string;
  requestedCourierProfileId: string;
  availableDrivers: DriverCandidate[];
};

export type AssignmentDecision = {
  accepted: boolean;
  deliveryStatus: DeliveryStatus;
  reason?: string;
};

export interface DispatchEngine {
  assignManually(input: ManualAssignmentRequest): AssignmentDecision;
}

export class MvpDispatchEngine implements DispatchEngine {
  assignManually(input: ManualAssignmentRequest): AssignmentDecision {
    const driver = input.availableDrivers.find(
      (candidate) => candidate.courierProfileId === input.requestedCourierProfileId,
    );

    if (!driver) {
      return { accepted: false, deliveryStatus: "unassigned", reason: "Driver not found" };
    }

    if (!driver.isActive) {
      return { accepted: false, deliveryStatus: "unassigned", reason: "Driver is not active" };
    }

    if (input.deliveryZoneId && !driver.zoneIds.includes(input.deliveryZoneId)) {
      return {
        accepted: false,
        deliveryStatus: "unassigned",
        reason: "Driver is outside the service zone",
      };
    }

    return { accepted: true, deliveryStatus: "assigned" };
  }
}
