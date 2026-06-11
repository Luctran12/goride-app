import type {
  PassengerPaymentMethod,
  PassengerVoucher,
  PaymentMethod,
  PaymentMethodDraft,
  VoucherListParams,
  VoucherValidationRequest,
  VoucherValidationResult,
} from '@/types/ride';

let mockPaymentMethods: PassengerPaymentMethod[] = [
  {
    id: 'cash',
    method: 'CASH',
    title: 'Tiền mặt',
    detail: 'Thanh toán trực tiếp cho tài xế',
    status: 'ACTIVE',
    isDefault: true,
    linked: true,
  },
  {
    id: 'momo',
    method: 'MOMO',
    title: 'Ví MoMo',
    detail: 'Sắp hỗ trợ liên kết ví',
    status: 'COMING_SOON',
    isDefault: false,
    linked: false,
    badge: 'Coming soon',
  },
  {
    id: 'vnpay',
    method: 'VNPAY',
    title: 'VNPay',
    detail: 'Sắp hỗ trợ thanh toán QR/ngân hàng',
    status: 'COMING_SOON',
    isDefault: false,
    linked: false,
    badge: 'Coming soon',
  },
];

let mockVouchers: PassengerVoucher[] = [
  {
    id: 'new-user',
    code: 'NEWUSER',
    title: 'Ưu đãi khách mới',
    description: 'Giảm 20% cho chuyến đi đầu tiên, tối đa 50.000đ.',
    discountType: 'PERCENT',
    discountValue: 20,
    maxDiscount: 50000,
    minFare: 30000,
    status: 'AVAILABLE',
    expiresAt: nextDate(21),
  },
  {
    id: 'cash-5k',
    code: 'CASH5K',
    title: 'Tiền mặt tiết kiệm',
    description: 'Giảm 5.000đ khi thanh toán tiền mặt.',
    discountType: 'FIXED',
    discountValue: 5000,
    minFare: 25000,
    status: 'AVAILABLE',
    eligiblePaymentMethods: ['CASH'],
    expiresAt: nextDate(14),
  },
  {
    id: 'online-10',
    code: 'ONLINE10',
    title: 'Thanh toán online',
    description: 'Dành cho MoMo/VNPay khi backend thanh toán online sẵn sàng.',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 30000,
    minFare: 40000,
    status: 'COMING_SOON',
    eligiblePaymentMethods: ['MOMO', 'VNPAY'],
    expiresAt: nextDate(45),
  },
];

export async function mockListPaymentMethods() {
  return clonePaymentMethods();
}

export async function mockAddPaymentMethod(draft: PaymentMethodDraft) {
  if (draft.method !== 'CASH') {
    throw new Error('MoMo/VNPay đang ở trạng thái coming soon, chưa thể liên kết trong bản MVP.');
  }

  const existingCash = mockPaymentMethods.find((item) => item.method === 'CASH');

  if (existingCash) {
    return { ...existingCash };
  }

  const method: PassengerPaymentMethod = {
    id: 'cash',
    method: 'CASH',
    title: draft.title?.trim() || 'Tiền mặt',
    detail: 'Thanh toán trực tiếp cho tài xế',
    status: 'ACTIVE',
    isDefault: mockPaymentMethods.length === 0,
    linked: true,
  };

  mockPaymentMethods = [method, ...mockPaymentMethods];
  return { ...method };
}

export async function mockSetDefaultPaymentMethod(methodId: string) {
  const selectedMethod = mockPaymentMethods.find((item) => item.id === methodId);

  if (!selectedMethod) {
    throw new Error('Không tìm thấy phương thức thanh toán.');
  }

  if (selectedMethod.status !== 'ACTIVE') {
    throw new Error('Phương thức thanh toán này chưa sẵn sàng để đặt làm mặc định.');
  }

  mockPaymentMethods = mockPaymentMethods.map((item) => ({
    ...item,
    isDefault: item.id === methodId,
  }));

  return {
    ...selectedMethod,
    isDefault: true,
  };
}

export async function mockRemovePaymentMethod(methodId: string) {
  const selectedMethod = mockPaymentMethods.find((item) => item.id === methodId);

  if (!selectedMethod) {
    throw new Error('Không tìm thấy phương thức thanh toán.');
  }

  if (selectedMethod.method === 'CASH') {
    throw new Error('Không thể xóa phương thức tiền mặt mặc định của GoRide.');
  }

  mockPaymentMethods = mockPaymentMethods.filter((item) => item.id !== methodId);

  if (!mockPaymentMethods.some((item) => item.isDefault)) {
    mockPaymentMethods = mockPaymentMethods.map((item, index) => ({
      ...item,
      isDefault: index === 0,
    }));
  }

  return { success: true };
}

export async function mockListVouchers(params: VoucherListParams = {}) {
  return cloneVouchers().filter((voucher) => {
    if (!params.includeUnavailable && voucher.status !== 'AVAILABLE') {
      return false;
    }

    if (
      params.paymentMethod &&
      voucher.eligiblePaymentMethods?.length &&
      !voucher.eligiblePaymentMethods.includes(params.paymentMethod)
    ) {
      return false;
    }

    return true;
  });
}

export async function mockValidateVoucher(
  request: VoucherValidationRequest,
): Promise<VoucherValidationResult> {
  const fare = Math.max(0, Math.round(request.fare));
  const voucher = mockVouchers.find((item) => item.code.toUpperCase() === request.code.trim().toUpperCase());

  if (!voucher) {
    return invalidVoucherResult(fare, 'Mã ưu đãi không tồn tại.');
  }

  if (voucher.status !== 'AVAILABLE') {
    return invalidVoucherResult(fare, 'Mã ưu đãi chưa sẵn sàng hoặc đã hết hiệu lực.', voucher);
  }

  if (voucher.minFare && fare < voucher.minFare) {
    return invalidVoucherResult(
      fare,
      `Đơn hàng cần tối thiểu ${formatVnd(voucher.minFare)} để dùng mã này.`,
      voucher,
    );
  }

  if (
    request.paymentMethod &&
    voucher.eligiblePaymentMethods?.length &&
    !voucher.eligiblePaymentMethods.includes(request.paymentMethod)
  ) {
    return invalidVoucherResult(fare, 'Mã ưu đãi không áp dụng cho phương thức thanh toán này.', voucher);
  }

  const discountAmount = calculateDiscount(fare, voucher);

  return {
    discountAmount,
    finalFare: Math.max(0, fare - discountAmount),
    isValid: true,
    message: `Đã áp dụng ${voucher.code}.`,
    voucher: { ...voucher },
  };
}

function clonePaymentMethods() {
  return mockPaymentMethods.map((item) => ({ ...item }));
}

function cloneVouchers() {
  return mockVouchers.map((item) => ({
    ...item,
    eligiblePaymentMethods: item.eligiblePaymentMethods ? [...item.eligiblePaymentMethods] : undefined,
  }));
}

function calculateDiscount(fare: number, voucher: PassengerVoucher) {
  if (voucher.discountType === 'FIXED') {
    return Math.min(fare, Math.round(voucher.discountValue));
  }

  const percentDiscount = Math.round((fare * voucher.discountValue) / 100);
  return Math.min(fare, voucher.maxDiscount ? Math.min(percentDiscount, voucher.maxDiscount) : percentDiscount);
}

function invalidVoucherResult(
  fare: number,
  message: string,
  voucher?: PassengerVoucher,
): VoucherValidationResult {
  return {
    discountAmount: 0,
    finalFare: fare,
    isValid: false,
    message,
    voucher: voucher ? { ...voucher } : undefined,
  };
}

function nextDate(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}
