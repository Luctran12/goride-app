import {
  mockAddPaymentMethod,
  mockListPaymentMethods,
  mockListVouchers,
  mockRemovePaymentMethod,
  mockSetDefaultPaymentMethod,
  mockValidateVoucher,
} from '@/lib/mock-payment-api';
import type {
  PassengerPaymentMethod,
  PassengerVoucher,
  PaymentMethodDraft,
  VoucherListParams,
  VoucherValidationRequest,
  VoucherValidationResult,
} from '@/types/ride';

export function listPaymentMethods(): Promise<PassengerPaymentMethod[]> {
  return mockListPaymentMethods();
}

export function addPaymentMethod(draft: PaymentMethodDraft): Promise<PassengerPaymentMethod> {
  return mockAddPaymentMethod(draft);
}

export function setDefaultPaymentMethod(methodId: string): Promise<PassengerPaymentMethod> {
  return mockSetDefaultPaymentMethod(methodId);
}

export function removePaymentMethod(methodId: string): Promise<{ success: boolean }> {
  return mockRemovePaymentMethod(methodId);
}

export function listVouchers(params: VoucherListParams = {}): Promise<PassengerVoucher[]> {
  return mockListVouchers(params);
}

export function validateVoucher(request: VoucherValidationRequest): Promise<VoucherValidationResult> {
  return mockValidateVoucher(request);
}
