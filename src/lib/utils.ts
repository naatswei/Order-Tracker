import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function detectGhanaNetworkProvider(phone: string): 'mtn' | 'vod' | 'atl' | null {
  const cleanPhone = phone.replace(/\D/g, "");
  let localPhone = cleanPhone;
  if (cleanPhone.startsWith("233")) {
    localPhone = "0" + cleanPhone.substring(3);
  }
  if (localPhone.length < 3) return null;
  const prefix = localPhone.substring(0, 3);
  if (["024", "054", "055", "059", "025", "053"].includes(prefix)) {
    return 'mtn';
  }
  if (["020", "050"].includes(prefix)) {
    return 'vod';
  }
  if (["026", "056", "027", "057"].includes(prefix)) {
    return 'atl';
  }
  return null;
}

export function isLogisticsFulfillmentStatus(status: string): boolean {
  const s = (status || "").toLowerCase().trim();
  // Intake, initial prep, and cancellation statuses do not require a rider
  const nonFulfillment = [
    "order received",
    "shipment booked",
    "pending",
    "order placed",
    "confirmed",
    "kitchen prep",
    "preparing",
    "processing",
    "cancelled",
    "order cancelled",
    "voided"
  ];
  return !nonFulfillment.includes(s);
}
