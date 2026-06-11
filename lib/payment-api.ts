import { apiRequest } from '@/lib/api';
import { USE_MOCK_API } from '@/lib/config';
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

type ApiResponse<TData> = {
  data?: TData;
  items?: TData extends Array<infer TItem> ? TItem[] : never;
  content?: TData extends Array<infer TItem> ? TItem[] : never;
  message?: string;
  success?: boolean;
};

type ApiListEnvelope<TItem> = ApiResponse<TItem[] | { items?: TItem[]; content?: TItem[] }> | TItem[];

export function listPaymentMethods() {
  return USE_MOCK_API
    ? mockListPaymentMethods()
    : apiRequest<ApiListEnvelope<PassengerPaymentMethod>>('/payment-methods').then(normalizeListResponse);
}

export function addPaymentMethod(draft: PaymentMethodDraft) {
  return USE_MOCK_API
    ? mockAddPaymentMethod(draft)
    : apiRequest<ApiResponse<PassengerPaymentMethod> | PassengerPaymentMethod>('/payment-methods', {
        method: 'POST',
        body: draft,
      }).then(unwrapData);
}

export function setDefaultPaymentMethod(methodId: string) {
  return USE_MOCK_API
    ? mockSetDefaultPaymentMethod(methodId)
    : apiRequest<ApiResponse<PassengerPaymentMethod> | PassengerPaymentMethod>(
        `/payment-methods/${encodeURIComponent(methodId)}/default`,
        { method: 'PATCH' },
      ).then(unwrapData);
}

export function removePaymentMethod(methodId: string) {
  return USE_MOCK_API
    ? mockRemovePaymentMethod(methodId)
    : apiRequest<ApiResponse<{ success: boolean }> | { success: boolean }>(
        `/payment-methods/${encodeURIComponent(methodId)}`,
        { method: 'DELETE' },
      ).then(unwrapData);
}

export function listVouchers(params: VoucherListParams = {}) {
  if (USE_MOCK_API) {
    return mockListVouchers(params);
  }

  return apiRequest<ApiListEnvelope<PassengerVoucher>>(`/vouchers${buildVoucherQuery(params)}`).then(
    normalizeListResponse,
  );
}

export function validateVoucher(request: VoucherValidationRequest) {
  return USE_MOCK_API
    ? mockValidateVoucher(request)
    : apiRequest<ApiResponse<VoucherValidationResult> | VoucherValidationResult>('/vouchers/validate', {
        method: 'POST',
        body: request,
      }).then(unwrapData);
}

function normalizeListResponse<TItem>(response: ApiListEnvelope<TItem>): TItem[] {
  if (Array.isArray(response)) {
    return response;
  }

  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    const nested = data as { items?: TItem[]; content?: TItem[] };
    return nested.items ?? nested.content ?? [];
  }

  return response.items ?? response.content ?? [];
}

function unwrapData<TData>(response: ApiResponse<TData> | TData): TData {
  if (isApiResponse(response)) {
    if (response.success === false) {
      throw new Error(response.message ?? 'Yêu cầu không thành công.');
    }

    if (response.data !== undefined) {
      return response.data;
    }
  }

  return response as TData;
}

function isApiResponse<TData>(value: ApiResponse<TData> | TData): value is ApiResponse<TData> {
  return typeof value === 'object' && value !== null && ('data' in value || 'success' in value);
}

function buildVoucherQuery(params: VoucherListParams) {
  const query = [
    params.includeUnavailable !== undefined
      ? `includeUnavailable=${params.includeUnavailable ? 'true' : 'false'}`
      : undefined,
    params.paymentMethod ? `paymentMethod=${encodeURIComponent(params.paymentMethod)}` : undefined,
  ]
    .filter(Boolean)
    .join('&');

  return query ? `?${query}` : '';
}
