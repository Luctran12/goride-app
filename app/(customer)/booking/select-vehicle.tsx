import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DEFAULT_VEHICLE_OPTIONS,
  RoutePreview,
  VehicleOptionCard,
  legacyIdFromVehicleType,
} from '@/components/booking';
import { rf, rs, rvs } from '@/constants/responsive';
import { listPaymentMethods, listVouchers, validateVoucher } from '@/lib/payment-api';
import { createBooking, estimateBooking } from '@/lib/ride-api';
import type {
  BookingDraft,
  BookingEstimate,
  LocationPoint,
  PassengerPaymentMethod,
  PassengerVoucher,
  PaymentMethod,
  PaymentMethodStatus,
  VehicleType,
  VoucherStatus,
  VoucherValidationResult,
} from '@/types/ride';

const palette = {
  background: '#fcf8ff',
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  danger: '#d72828',
  amber: '#f59e0b',
  amberSoft: '#fff7df',
  green: '#00b67a',
  greenSoft: '#dff8ef',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 24,
  elevation: 7,
};

type PaymentOption = {
  id: string;
  method: PaymentMethod;
  label: string;
  helper: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: string;
  softTone: string;
  status: PaymentMethodStatus;
  isDefault: boolean;
  linked: boolean;
  badge?: string;
};

type PromotionOption = {
  code: string | null;
  title: string;
  description: string;
  badge?: string;
  status: VoucherStatus;
  voucher?: PassengerVoucher;
};

const paymentThemeByMethod: Record<
  PaymentMethod,
  Pick<PaymentOption, 'icon' | 'tone' | 'softTone'>
> = {
  CASH: {
    icon: 'cash',
    tone: palette.green,
    softTone: palette.greenSoft,
  },
  MOMO: {
    icon: 'wallet-outline',
    tone: '#b0006d',
    softTone: '#ffe8f5',
  },
  VNPAY: {
    icon: 'bank-transfer',
    tone: '#0b63ce',
    softTone: '#e8f1ff',
  },
};

const fallbackPaymentMethods: PassengerPaymentMethod[] = [
  {
    id: 'cash',
    method: 'CASH',
    title: 'Tiền mặt',
    detail: 'Thanh toán sau chuyến',
    status: 'ACTIVE',
    isDefault: true,
    linked: true,
  },
  {
    id: 'momo',
    method: 'MOMO',
    title: 'MoMo',
    detail: 'Sắp hỗ trợ ví điện tử',
    status: 'COMING_SOON',
    isDefault: false,
    linked: false,
    badge: 'Sắp có',
  },
  {
    id: 'vnpay',
    method: 'VNPAY',
    title: 'VNPay',
    detail: 'Sắp hỗ trợ QR ngân hàng',
    status: 'COMING_SOON',
    isDefault: false,
    linked: false,
    badge: 'Sắp có',
  },
];

const noPromotionOption: PromotionOption = {
  code: null,
  title: 'Không dùng ưu đãi',
  description: 'Giữ nguyên giá ước tính',
  status: 'AVAILABLE',
};

const fallbackPromotionOptions: PromotionOption[] = [
  {
    ...noPromotionOption,
  },
];

export default function SelectVehicleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pickupParam = readParam(params.pickup);
  const dropoffParam = readParam(params.dropoff);
  const pickupLatParam = readParam(params.pickupLat);
  const pickupLngParam = readParam(params.pickupLng);
  const pickupLabelParam = readParam(params.pickupLabel);
  const destLatParam = readParam(params.destLat);
  const destLngParam = readParam(params.destLng);
  const destLabelParam = readParam(params.destLabel);
  const route = useMemo(
    () =>
      resolveRouteFromParams({
        pickup: pickupParam,
        dropoff: dropoffParam,
        pickupLat: pickupLatParam,
        pickupLng: pickupLngParam,
        pickupLabel: pickupLabelParam,
        destLat: destLatParam,
        destLng: destLngParam,
        destLabel: destLabelParam,
      }),
    [
      destLabelParam,
      destLatParam,
      destLngParam,
      dropoffParam,
      pickupLabelParam,
      pickupLatParam,
      pickupLngParam,
      pickupParam,
    ],
  );
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('MOTORBIKE');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('CASH');
  const [selectedPromotionCode, setSelectedPromotionCode] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PassengerPaymentMethod[]>(fallbackPaymentMethods);
  const [vouchers, setVouchers] = useState<PassengerVoucher[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [voucherValidation, setVoucherValidation] = useState<VoucherValidationResult | null>(null);
  const [voucherValidationLoading, setVoucherValidationLoading] = useState(false);
  const [voucherValidationError, setVoucherValidationError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<BookingEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [retrySeed, setRetrySeed] = useState(0);

  const estimateDraft = useMemo<BookingDraft | null>(() => {
    if (!route.pickup || !route.dropoff) {
      return null;
    }

    return {
      pickup: route.pickup,
      dropoff: route.dropoff,
      vehicleType: selectedVehicle,
      paymentMethod: selectedPayment,
    };
  }, [route.dropoff, route.pickup, selectedPayment, selectedVehicle]);

  const activeVoucherValidation =
    selectedPromotionCode && voucherValidation?.isValid ? voucherValidation : null;
  const discountAmount = activeVoucherValidation?.discountAmount ?? 0;
  const finalFare = estimate
    ? activeVoucherValidation?.finalFare ?? estimate.estimatedFare
    : null;
  const bookingEstimate = useMemo<BookingEstimate | null>(() => {
    if (!estimate) {
      return null;
    }

    return {
      ...estimate,
      estimatedFare: finalFare ?? estimate.estimatedFare,
    };
  }, [estimate, finalFare]);

  const bookingDraft = useMemo<BookingDraft | null>(() => {
    if (!estimateDraft) {
      return null;
    }

    return {
      ...estimateDraft,
      voucherCode: activeVoucherValidation?.voucher?.code,
      discountAmount,
      finalFare: finalFare ?? undefined,
    };
  }, [activeVoucherValidation?.voucher?.code, discountAmount, estimateDraft, finalFare]);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      setCheckoutLoading(true);
      setCheckoutError(null);

      try {
        const [methodResult, voucherResult] = await Promise.allSettled([
          listPaymentMethods(),
          listVouchers({ includeUnavailable: true }),
        ]);

        if (cancelled) {
          return;
        }

        if (methodResult.status === 'fulfilled' && methodResult.value.length) {
          setPaymentMethods(methodResult.value);

          const defaultMethod =
            methodResult.value.find((method) => method.status === 'ACTIVE' && method.linked && method.isDefault) ??
            methodResult.value.find((method) => method.status === 'ACTIVE' && method.linked);

          if (defaultMethod) {
            setSelectedPayment(defaultMethod.method);
          }
        } else if (methodResult.status === 'rejected') {
          setPaymentMethods(fallbackPaymentMethods);
          setCheckoutError(methodResult.reason instanceof Error ? methodResult.reason.message : 'Không thể tải ví.');
        }

        if (voucherResult.status === 'fulfilled') {
          setVouchers(voucherResult.value);
        } else {
          setVouchers([]);
          setCheckoutError((currentError) =>
            currentError ??
            (voucherResult.reason instanceof Error
              ? voucherResult.reason.message
              : 'Không thể tải danh sách ưu đãi.'),
          );
        }
      } finally {
        if (!cancelled) {
          setCheckoutLoading(false);
        }
      }
    }

    void loadCheckoutData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!estimateDraft) {
      setEstimate(null);
      setEstimateError('Thiếu điểm đón hoặc điểm đến. Vui lòng chọn lại lộ trình.');
      return;
    }

    const activeDraft = estimateDraft;
    let cancelled = false;

    async function loadEstimate() {
      setEstimateLoading(true);
      setEstimateError(null);

      try {
        const nextEstimate = await estimateBooking(activeDraft);

        if (!cancelled) {
          setEstimate(nextEstimate);
        }
      } catch (error) {
        if (!cancelled) {
          setEstimate(null);
          setEstimateError(error instanceof Error ? error.message : 'Không thể tính giá ước tính');
        }
      } finally {
        if (!cancelled) {
          setEstimateLoading(false);
        }
      }
    }

    void loadEstimate();

    return () => {
      cancelled = true;
    };
  }, [estimateDraft, retrySeed]);

  useEffect(() => {
    if (!selectedPromotionCode) {
      setVoucherValidation(null);
      setVoucherValidationError(null);
      setVoucherValidationLoading(false);
      return;
    }

    if (!estimate) {
      setVoucherValidation(null);
      setVoucherValidationError('Chờ GoRide tính giá trước khi áp dụng ưu đãi.');
      setVoucherValidationLoading(false);
      return;
    }

    const activePromotionCode = selectedPromotionCode;
    const activeEstimate = estimate;
    let cancelled = false;

    async function validateSelectedVoucher() {
      setVoucherValidationLoading(true);
      setVoucherValidationError(null);

      try {
        const result = await validateVoucher({
          code: activePromotionCode,
          fare: activeEstimate.estimatedFare,
          paymentMethod: selectedPayment,
        });

        if (!cancelled) {
          setVoucherValidation(result);
          setVoucherValidationError(result.isValid ? null : result.message ?? 'Ưu đãi không khả dụng.');
        }
      } catch (error) {
        if (!cancelled) {
          setVoucherValidation(null);
          setVoucherValidationError(error instanceof Error ? error.message : 'Không thể kiểm tra ưu đãi.');
        }
      } finally {
        if (!cancelled) {
          setVoucherValidationLoading(false);
        }
      }
    }

    void validateSelectedVoucher();

    return () => {
      cancelled = true;
    };
  }, [estimate, selectedPayment, selectedPromotionCode]);

  const vehicleOptions = useMemo(
    () =>
      DEFAULT_VEHICLE_OPTIONS.map((option) => ({
        ...option,
        estimatedFare: option.vehicleType === selectedVehicle ? estimate?.estimatedFare ?? null : null,
        metaLabel: option.vehicleType === selectedVehicle ? 'Đang chọn' : option.metaLabel,
      })),
    [estimate?.estimatedFare, selectedVehicle],
  );

  const paymentOptions = useMemo(() => paymentMethods.map(toPaymentOption), [paymentMethods]);
  const promotionOptions = useMemo<PromotionOption[]>(
    () =>
      vouchers.length
        ? [
            noPromotionOption,
            ...vouchers.map((voucher) => ({
              code: voucher.code,
              title: voucher.title,
              description: getVoucherDescription(voucher),
              badge: getVoucherBadge(voucher),
              status: voucher.status,
              voucher,
            })),
          ]
        : fallbackPromotionOptions,
    [vouchers],
  );

  const selectedOption = vehicleOptions.find((option) => option.vehicleType === selectedVehicle) ?? vehicleOptions[0];
  const selectedPaymentOption =
    paymentOptions.find((option) => option.method === selectedPayment) ?? paymentOptions[0];
  const selectedPromotion =
    promotionOptions.find((option) => option.code === selectedPromotionCode) ?? promotionOptions[0];
  const selectedPaymentReady = isPaymentOptionReady(selectedPaymentOption);
  const selectedVoucherBlocked = Boolean(
    selectedPromotionCode &&
      (voucherValidationLoading || voucherValidationError || !voucherValidation?.isValid),
  );
  const canContinue = Boolean(
    bookingDraft &&
      bookingEstimate &&
      selectedPaymentReady &&
      !estimateLoading &&
      !estimateError &&
      !bookingLoading &&
      !selectedVoucherBlocked,
  );

  const handlePaymentPress = (option: PaymentOption) => {
    if (!isPaymentOptionReady(option)) {
      Alert.alert(
        'Sắp hỗ trợ',
        `${option.label} đang được chuẩn bị. Hiện GoRide mini ưu tiên thanh toán tiền mặt để đặt xe ổn định.`,
      );
      return;
    }

    setSelectedPayment(option.method);
  };

  const handlePromotionPress = (option: PromotionOption) => {
    if (!option.code) {
      setSelectedPromotionCode(null);
      return;
    }

    if (option.status !== 'AVAILABLE') {
      Alert.alert(option.title, getUnavailableVoucherMessage(option.status));
      return;
    }

    setSelectedPromotionCode(option.code);
  };

  const handleConfirmBooking = async () => {
    if (!bookingDraft || !bookingEstimate) {
      Alert.alert('Chưa có giá ước tính', 'Vui lòng chờ GoRide tính giá hoặc thử lại trước khi đặt xe.');
      return;
    }

    if (!selectedPaymentReady) {
      Alert.alert('Thanh toán chưa sẵn sàng', `${selectedPaymentOption.label} chưa thể dùng trong bản MVP này.`);
      return;
    }

    if (selectedVoucherBlocked) {
      Alert.alert('Ưu đãi chưa hợp lệ', voucherValidationError ?? 'Vui lòng bỏ ưu đãi hoặc chọn mã khác.');
      return;
    }

    if (bookingLoading) {
      return;
    }

    const activeDraft = bookingDraft;
    const activeEstimate = bookingEstimate;

    setBookingLoading(true);
    setBookingError(null);

    try {
      const booking = await createBooking(activeDraft, activeEstimate);
      const estimatedFare = booking.estimatedFare ?? activeEstimate.estimatedFare;
      const estimatedDistance = booking.estimatedDistance ?? activeEstimate.estimatedDistance;
      const promoCode = activeVoucherValidation?.voucher?.code ?? selectedPromotionCode ?? '';

      router.push({
        pathname: '/(customer)/booking/waiting-driver',
        params: {
          tripId: String(booking.tripId),
          tripStatus: booking.status,
          pickup: JSON.stringify(activeDraft.pickup),
          dropoff: JSON.stringify(activeDraft.dropoff),
          pickupLat: String(activeDraft.pickup.lat),
          pickupLng: String(activeDraft.pickup.lng),
          pickupLabel: activeDraft.pickup.label ?? activeDraft.pickup.address,
          destLat: String(activeDraft.dropoff.lat),
          destLng: String(activeDraft.dropoff.lng),
          destLabel: activeDraft.dropoff.label ?? activeDraft.dropoff.address,
          vehicleType: legacyIdFromVehicleType(selectedVehicle),
          vehicleTypeEnum: selectedVehicle,
          distance: estimatedDistance.toFixed(1),
          estimatedDistance: String(estimatedDistance),
          estimatedDuration: String(activeEstimate.estimatedDuration),
          estimatedFare: String(estimatedFare),
          pricingConfigId: String(activeEstimate.pricingConfigId),
          paymentMethod: selectedPayment,
          paymentLabel: selectedPaymentOption.label,
          promoCode,
          originalFare: estimate ? String(estimate.estimatedFare) : '',
          discountAmount: String(discountAmount),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo booking';
      setBookingError(message);
      Alert.alert('Không thể đặt xe', `${message}. Vui lòng thử lại, lộ trình của bạn vẫn được giữ nguyên.`);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={rs(40)} color={palette.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GoRide Passenger</Text>
          <Text style={styles.title}>Chọn loại xe</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <RoutePreview
          pickup={route.pickup}
          dropoff={route.dropoff}
          estimate={estimate}
          loading={estimateLoading}
          error={estimateError}
          paymentLabel={selectedPaymentOption.label}
          onRetry={() => setRetrySeed((value) => value + 1)}
        />

        {(checkoutLoading || checkoutError) && (
          <View style={[styles.checkoutStateCard, checkoutError && styles.checkoutStateCardError]}>
            {checkoutLoading ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Ionicons name="cloud-offline-outline" size={rs(24)} color={palette.amber} />
            )}
            <Text style={[styles.checkoutStateText, checkoutError && styles.checkoutStateTextError]}>
              {checkoutLoading
                ? 'Đang đồng bộ phương thức thanh toán và ưu đãi...'
                : `${checkoutError} GoRide vẫn giữ lựa chọn tiền mặt để bạn tiếp tục đặt xe.`}
            </Text>
          </View>
        )}

        {bookingError && (
          <View style={styles.bookingErrorCard}>
            <Ionicons name="warning-outline" size={rs(26)} color={palette.danger} />
            <Text style={styles.bookingErrorText}>{bookingError}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dịch vụ đề xuất</Text>
          {estimateLoading && (
            <View style={styles.loadingPill}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.loadingText}>Đang tính giá</Text>
            </View>
          )}
        </View>

        <View style={styles.vehicleList}>
          {vehicleOptions.map((option) => (
            <VehicleOptionCard
              key={option.vehicleType}
              option={option}
              selected={option.vehicleType === selectedVehicle}
              loading={option.vehicleType === selectedVehicle && estimateLoading}
              onPress={setSelectedVehicle}
            />
          ))}
        </View>

        <View style={styles.optionSection}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <View style={styles.paymentGrid}>
            {paymentOptions.map((option) => (
              <PaymentMethodCard
                key={option.method}
                option={option}
                selected={option.method === selectedPayment}
                onPress={() => handlePaymentPress(option)}
              />
            ))}
          </View>
        </View>

        <View style={styles.optionSection}>
          <Text style={styles.sectionTitle}>Ưu đãi</Text>
          <View style={styles.promoList}>
            {promotionOptions.map((option) => (
              <PromotionCard
                key={option.code ?? 'none'}
                option={option}
                selected={option.code === selectedPromotionCode}
                validationResult={option.code === selectedPromotionCode ? voucherValidation : null}
                validationLoading={option.code === selectedPromotionCode && voucherValidationLoading}
                validationError={option.code === selectedPromotionCode ? voucherValidationError : null}
                onPress={() => handlePromotionPress(option)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.paymentSection}>
          <View style={styles.paymentInfo}>
            <View style={[styles.paymentIconBox, { backgroundColor: selectedPaymentOption.softTone }]}>
              <MaterialCommunityIcons
                name={selectedPaymentOption.icon}
                size={rs(32)}
                color={selectedPaymentOption.tone}
              />
            </View>
            <View>
              <Text style={styles.paymentLabel}>Thanh toán</Text>
              <Text style={styles.paymentMethod}>{selectedPaymentOption.label}</Text>
              <Text style={styles.promotionSummary} numberOfLines={1}>
                {selectedPromotion.code
                  ? voucherValidationLoading
                    ? 'Đang kiểm tra ưu đãi...'
                    : activeVoucherValidation
                      ? `Ưu đãi: ${activeVoucherValidation.voucher?.code ?? selectedPromotion.code}`
                      : `Ưu đãi chưa hợp lệ: ${selectedPromotion.code}`
                  : 'Chưa dùng ưu đãi'}
              </Text>
            </View>
          </View>
          <View style={styles.fareSummary}>
            <Text style={styles.fareLabel}>{discountAmount > 0 ? 'Sau ưu đãi' : 'Tạm tính'}</Text>
            {discountAmount > 0 && estimate ? (
              <Text style={styles.originalFareValue}>{formatFare(estimate.estimatedFare)}</Text>
            ) : null}
            <Text style={styles.fareValue}>{finalFare !== null ? formatFare(finalFare) : '-- đ'}</Text>
            {discountAmount > 0 ? (
              <Text style={styles.discountText}>Giảm {formatFare(discountAmount)}</Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!canContinue}
          style={[styles.confirmButton, !canContinue && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Đặt {selectedOption.title}</Text>
              <Feather name="arrow-right" size={rs(32)} color="#fff" style={styles.confirmButtonIcon} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PaymentMethodCard({
  option,
  selected,
  onPress,
}: {
  option: PaymentOption;
  selected: boolean;
  onPress: () => void;
}) {
  const disabled = !isPaymentOptionReady(option);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      style={[
        styles.paymentOptionCard,
        selected && styles.paymentOptionCardSelected,
        disabled && styles.paymentOptionCardDisabled,
      ]}
    >
      <View style={[styles.paymentOptionIcon, { backgroundColor: option.softTone }]}>
        <MaterialCommunityIcons name={option.icon} size={rs(30)} color={option.tone} />
      </View>
      <View style={styles.paymentOptionCopy}>
        <Text style={styles.paymentOptionTitle}>{option.label}</Text>
        <Text style={styles.paymentOptionHelper}>{option.helper}</Text>
      </View>
      {option.badge || disabled ? (
        <View style={[styles.methodBadge, disabled && styles.methodBadgeMuted]}>
          <Text style={[styles.methodBadgeText, disabled && styles.methodBadgeTextMuted]}>
            {option.badge ?? getPaymentStatusLabel(option.status)}
          </Text>
        </View>
      ) : null}
      {selected && <Ionicons name="checkmark-circle" size={rs(26)} color={palette.primary} />}
    </TouchableOpacity>
  );
}

function PromotionCard({
  option,
  selected,
  validationResult,
  validationLoading,
  validationError,
  onPress,
}: {
  option: PromotionOption;
  selected: boolean;
  validationResult?: VoucherValidationResult | null;
  validationLoading?: boolean;
  validationError?: string | null;
  onPress: () => void;
}) {
  const unavailable = option.status !== 'AVAILABLE';
  const validSelected = Boolean(selected && validationResult?.isValid);
  const noneSelected = selected && !option.code;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: unavailable }}
      onPress={onPress}
      style={[
        styles.promoCard,
        selected && styles.promoCardSelected,
        unavailable && styles.promoCardDisabled,
      ]}
    >
      <View style={[styles.promoIcon, selected && styles.promoIconSelected, validSelected && styles.promoIconValid]}>
        {validationLoading ? (
          <ActivityIndicator size="small" color={selected ? '#fff' : palette.primary} />
        ) : (
          <MaterialCommunityIcons
            name="ticket-percent-outline"
            size={rs(28)}
            color={selected ? '#fff' : palette.primary}
          />
        )}
      </View>
      <View style={styles.promoCopy}>
        <View style={styles.promoTitleRow}>
          <Text style={styles.promoTitle}>{option.title}</Text>
          {option.badge && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>{option.badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.promoDescription}>{option.description}</Text>
        {selected && (validationError || validationResult?.message) ? (
          <Text style={[styles.promoValidationText, validSelected && styles.promoValidationTextSuccess]}>
            {validationResult?.isValid
              ? `${validationResult.message ?? 'Đã áp dụng ưu đãi.'} Giảm ${formatFare(validationResult.discountAmount)}`
              : validationError ?? validationResult?.message}
          </Text>
        ) : null}
      </View>
      {(validSelected || noneSelected) && (
        <Ionicons name="checkmark-circle" size={rs(28)} color={validSelected ? palette.green : palette.primary} />
      )}
      {selected && option.code && !validSelected && !validationLoading ? (
        <Ionicons name="alert-circle" size={rs(28)} color={palette.amber} />
      ) : null}
    </TouchableOpacity>
  );
}

function toPaymentOption(method: PassengerPaymentMethod): PaymentOption {
  const theme = paymentThemeByMethod[method.method];

  return {
    id: method.id,
    method: method.method,
    label: method.title,
    helper: method.detail,
    icon: theme.icon,
    tone: theme.tone,
    softTone: theme.softTone,
    status: method.status,
    isDefault: method.isDefault,
    linked: method.linked,
    badge: method.badge ?? (method.isDefault ? 'Mặc định' : undefined),
  };
}

function isPaymentOptionReady(option?: PaymentOption) {
  return Boolean(option && option.status === 'ACTIVE' && option.linked);
}

function getPaymentStatusLabel(status: PaymentMethodStatus) {
  if (status === 'COMING_SOON') {
    return 'Sắp có';
  }

  if (status === 'DISABLED') {
    return 'Tạm khóa';
  }

  return 'Sẵn sàng';
}

function getVoucherDescription(voucher: PassengerVoucher) {
  const meta = [
    voucher.minFare ? `Tối thiểu ${formatFare(voucher.minFare)}` : undefined,
    voucher.maxDiscount ? `Tối đa ${formatFare(voucher.maxDiscount)}` : undefined,
    voucher.eligiblePaymentMethods?.length
      ? `Áp dụng: ${voucher.eligiblePaymentMethods.map(getPaymentMethodLabel).join(', ')}`
      : undefined,
  ].filter(Boolean);

  return meta.length ? `${voucher.description} ${meta.join(' • ')}` : voucher.description;
}

function getVoucherBadge(voucher: PassengerVoucher) {
  if (voucher.status !== 'AVAILABLE') {
    return getVoucherStatusLabel(voucher.status);
  }

  if (voucher.discountType === 'FIXED') {
    return `-${formatFare(voucher.discountValue)}`;
  }

  return `-${voucher.discountValue}%`;
}

function getVoucherStatusLabel(status: VoucherStatus) {
  if (status === 'COMING_SOON') {
    return 'Sắp có';
  }

  if (status === 'EXPIRED') {
    return 'Hết hạn';
  }

  if (status === 'USED') {
    return 'Đã dùng';
  }

  return 'Dùng được';
}

function getUnavailableVoucherMessage(status: VoucherStatus) {
  if (status === 'COMING_SOON') {
    return 'Ưu đãi này sẽ được bật khi backend thanh toán/voucher sẵn sàng.';
  }

  if (status === 'EXPIRED') {
    return 'Ưu đãi này đã hết hạn, vui lòng chọn mã khác.';
  }

  if (status === 'USED') {
    return 'Ưu đãi này đã được sử dụng.';
  }

  return 'Ưu đãi này chưa thể áp dụng.';
}

function getPaymentMethodLabel(method: PaymentMethod) {
  if (method === 'MOMO') {
    return 'MoMo';
  }

  if (method === 'VNPAY') {
    return 'VNPay';
  }

  return 'Tiền mặt';
}

type SearchParams = Record<string, string | string[] | undefined>;

type RoutePoints = {
  pickup: LocationPoint | null;
  dropoff: LocationPoint | null;
};

function resolveRouteFromParams(params: SearchParams): RoutePoints {
  return {
    pickup: parseLocationPointParam(params.pickup) ?? parseLegacyLocation(params, 'pickup'),
    dropoff: parseLocationPointParam(params.dropoff) ?? parseLegacyLocation(params, 'dest'),
  };
}

function parseLocationPointParam(value: string | string[] | undefined): LocationPoint | null {
  const rawValue = readParam(value);

  if (!rawValue) {
    return null;
  }

  const candidates = [rawValue];

  try {
    candidates.push(decodeURIComponent(rawValue));
  } catch {
    // Expo Router usually decodes params already; this protects direct links.
  }

  for (const candidate of candidates) {
    try {
      return normalizeLocationPoint(JSON.parse(candidate));
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function parseLegacyLocation(params: SearchParams, prefix: 'pickup' | 'dest'): LocationPoint | null {
  const lat = Number(readParam(params[`${prefix}Lat`]));
  const lng = Number(readParam(params[`${prefix}Lng`]));
  const label = readParam(params[`${prefix}Label`]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: label || (prefix === 'pickup' ? 'Điểm đón đã chọn' : 'Điểm đến đã chọn'),
    label: label || (prefix === 'pickup' ? 'Điểm đón' : 'Điểm đến'),
  };
}

function normalizeLocationPoint(value: unknown): LocationPoint | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<LocationPoint>;
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    address: typeof candidate.address === 'string' && candidate.address ? candidate.address : `${lat}, ${lng}`,
    label: typeof candidate.label === 'string' ? candidate.label : undefined,
    placeId: typeof candidate.placeId === 'string' ? candidate.placeId : undefined,
  };
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatFare(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(18),
    paddingHorizontal: rs(28),
    paddingTop: rvs(28),
    paddingBottom: rvs(18),
  },
  backButton: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  headerCopy: {
    flex: 1,
    gap: rvs(4),
  },
  eyebrow: {
    color: palette.primaryMid,
    fontSize: rf(18),
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: rf(36),
    fontWeight: '900',
  },
  container: {
    paddingHorizontal: rs(28),
    paddingBottom: rvs(36),
    gap: rvs(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  sectionTitle: {
    flex: 1,
    color: palette.text,
    fontSize: rf(28),
    fontWeight: '900',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(14),
    height: rvs(40),
    borderRadius: rs(20),
    backgroundColor: palette.primarySoft,
  },
  loadingText: {
    color: palette.primary,
    fontSize: rf(16),
    fontWeight: '800',
  },
  vehicleList: {
    gap: rvs(16),
  },
  optionSection: {
    gap: rvs(14),
  },
  paymentGrid: {
    gap: rvs(12),
  },
  paymentOptionCard: {
    minHeight: rvs(84),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingVertical: rvs(14),
    paddingHorizontal: rs(16),
    borderRadius: rs(26),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    ...shadow,
  },
  paymentOptionCardSelected: {
    borderColor: palette.primary,
    backgroundColor: '#faf8ff',
  },
  paymentOptionCardDisabled: {
    opacity: 0.62,
  },
  paymentOptionIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionCopy: {
    flex: 1,
    gap: rvs(4),
  },
  paymentOptionTitle: {
    color: palette.text,
    fontSize: rf(21),
    fontWeight: '900',
  },
  paymentOptionHelper: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '700',
  },
  methodBadge: {
    paddingHorizontal: rs(10),
    height: rvs(28),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  methodBadgeMuted: {
    backgroundColor: palette.amberSoft,
  },
  methodBadgeText: {
    color: palette.primary,
    fontSize: rf(13),
    fontWeight: '900',
  },
  methodBadgeTextMuted: {
    color: palette.amber,
  },
  promoList: {
    gap: rvs(12),
  },
  promoCard: {
    minHeight: rvs(86),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingVertical: rvs(14),
    paddingHorizontal: rs(16),
    borderRadius: rs(26),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
  },
  promoCardSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  promoCardDisabled: {
    opacity: 0.62,
  },
  promoIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  promoIconSelected: {
    backgroundColor: palette.primary,
  },
  promoIconValid: {
    backgroundColor: palette.green,
  },
  promoCopy: {
    flex: 1,
    gap: rvs(5),
  },
  promoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  promoTitle: {
    color: palette.text,
    fontSize: rf(20),
    fontWeight: '900',
  },
  promoBadge: {
    paddingHorizontal: rs(9),
    height: rvs(26),
    borderRadius: rs(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
  },
  promoBadgeText: {
    color: palette.primary,
    fontSize: rf(13),
    fontWeight: '900',
  },
  promoDescription: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '700',
  },
  promoValidationText: {
    color: palette.amber,
    fontSize: rf(15),
    lineHeight: rf(21),
    fontWeight: '800',
  },
  promoValidationTextSuccess: {
    color: palette.green,
  },
  checkoutStateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#e6ddff',
  },
  checkoutStateCardError: {
    backgroundColor: palette.amberSoft,
    borderColor: '#fde7a1',
  },
  checkoutStateText: {
    flex: 1,
    color: palette.primary,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '800',
  },
  checkoutStateTextError: {
    color: '#9a5b00',
  },
  bookingErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#ffd0d0',
  },
  bookingErrorText: {
    flex: 1,
    color: palette.danger,
    fontSize: rf(17),
    fontWeight: '800',
    lineHeight: rf(24),
  },
  footer: {
    paddingHorizontal: rs(28),
    paddingTop: rvs(20),
    paddingBottom: rvs(34),
    borderTopLeftRadius: rs(34),
    borderTopRightRadius: rs(34),
    backgroundColor: palette.card,
    ...shadow,
  },
  paymentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(16),
    marginBottom: rvs(18),
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  paymentIconBox: {
    width: rs(66),
    height: rs(66),
    borderRadius: rs(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.greenSoft,
  },
  paymentLabel: {
    color: palette.muted,
    fontSize: rf(18),
    fontWeight: '700',
  },
  paymentMethod: {
    color: palette.text,
    fontSize: rf(22),
    fontWeight: '900',
  },
  promotionSummary: {
    maxWidth: rs(300),
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '700',
  },
  fareSummary: {
    alignItems: 'flex-end',
    gap: rvs(3),
  },
  fareLabel: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '700',
  },
  fareValue: {
    color: palette.primary,
    fontSize: rf(26),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  originalFareValue: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '800',
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  discountText: {
    color: palette.green,
    fontSize: rf(15),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  confirmButton: {
    height: rvs(92),
    borderRadius: rs(30),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: rf(25),
    fontWeight: '900',
  },
  confirmButtonIcon: {
    marginLeft: rs(12),
  },
});
