import { rf, rs, rvs } from '@/constants/responsive';
import {
  addPaymentMethod,
  listPaymentMethods,
  listVouchers,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from '@/lib/payment-api';
import type { PassengerPaymentMethod, PassengerVoucher, PaymentMethod } from '@/types/ride';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const palette = {
  background: '#fcf8ff',
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  green: '#00b67a',
  amber: '#b7791f',
  amberSoft: '#fff7df',
  danger: '#c91c1c',
  dangerSoft: '#fdeaea',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 6,
};

export default function PaymentScreen() {
  const router = useRouter();
  const mountedRef = React.useRef(false);
  const [paymentMethods, setPaymentMethods] = React.useState<PassengerPaymentMethod[]>([]);
  const [vouchers, setVouchers] = React.useState<PassengerVoucher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionMethodId, setActionMethodId] = React.useState<string | null>(null);
  const [addingMethod, setAddingMethod] = React.useState(false);

  const loadBillingData = React.useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [nextMethods, nextVouchers] = await Promise.all([
        listPaymentMethods(),
        listVouchers({ includeUnavailable: true }),
      ]);

      if (mountedRef.current) {
        setPaymentMethods(nextMethods);
        setVouchers(nextVouchers);
      }
    } catch (loadError) {
      if (mountedRef.current) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    void loadBillingData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadBillingData]);

  async function handleAddPaymentMethod() {
    if (addingMethod) {
      return;
    }

    setAddingMethod(true);
    setError(null);

    try {
      await addPaymentMethod({ method: 'CASH', title: 'Tiền mặt' });
      await loadBillingData({ silent: true });
      Alert.alert('Phương thức thanh toán', 'Tiền mặt đã sẵn sàng. MoMo/VNPay sẽ được mở khi backend thanh toán online hoàn tất.');
    } catch (addError) {
      Alert.alert('Không thể thêm phương thức', getErrorMessage(addError));
    } finally {
      if (mountedRef.current) {
        setAddingMethod(false);
      }
    }
  }

  async function handlePaymentMethodPress(method: PassengerPaymentMethod) {
    if (actionMethodId) {
      return;
    }

    if (method.status !== 'ACTIVE') {
      Alert.alert(method.title, 'Phương thức này đang ở trạng thái coming soon, chưa thể dùng trong bản MVP.');
      return;
    }

    if (method.isDefault) {
      Alert.alert(method.title, 'Đây đã là phương thức thanh toán mặc định của bạn.');
      return;
    }

    setActionMethodId(method.id);
    setError(null);

    try {
      await setDefaultPaymentMethod(method.id);
      await loadBillingData({ silent: true });
    } catch (methodError) {
      Alert.alert('Không thể đặt mặc định', getErrorMessage(methodError));
    } finally {
      if (mountedRef.current) {
        setActionMethodId(null);
      }
    }
  }

  function handleRemovePaymentMethod(method: PassengerPaymentMethod) {
    if (actionMethodId) {
      return;
    }

    if (method.method === 'CASH') {
      Alert.alert('Không thể xóa tiền mặt', 'GoRide luôn giữ tiền mặt làm phương thức thanh toán dự phòng.');
      return;
    }

    Alert.alert(
      'Xóa phương thức thanh toán?',
      method.isDefault
        ? `${method.title} đang là phương thức mặc định. Sau khi xóa, GoRide sẽ chuyển về phương thức còn lại nếu có.`
        : `Bạn có chắc muốn xóa ${method.title} khỏi ví GoRide?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void removeSelectedPaymentMethod(method);
          },
        },
      ],
    );
  }

  async function removeSelectedPaymentMethod(method: PassengerPaymentMethod) {
    setActionMethodId(method.id);
    setError(null);

    try {
      await removePaymentMethod(method.id);
      await loadBillingData({ silent: true });
      Alert.alert('Đã xóa phương thức', `${method.title} đã được gỡ khỏi ví GoRide.`);
    } catch (removeError) {
      Alert.alert('Không thể xóa phương thức', getErrorMessage(removeError));
    } finally {
      if (mountedRef.current) {
        setActionMethodId(null);
      }
    }
  }

  function handleVoucherPress(voucher: PassengerVoucher) {
    if (voucher.status !== 'AVAILABLE') {
      Alert.alert(voucher.code, 'Ưu đãi này chưa thể dùng trong bản MVP hiện tại.');
      return;
    }

    Alert.alert('Ưu đãi khả dụng', `Mã ${voucher.code} đã sẵn sàng. Bạn có thể chọn mã này ở màn hình đặt xe.`);
  }

  const availableVoucherCount = vouchers.filter((voucher) => voucher.status === 'AVAILABLE').length;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.82} style={styles.headerButton} onPress={() => router.push('/(customer)/profile')}>
            <Feather name="menu" size={rs(34)} color={palette.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Thanh toán</Text>

          <TouchableOpacity activeOpacity={0.82} style={styles.avatarWrap} onPress={() => router.push('/(customer)/profile')}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/160?img=11' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <BillingLoadingState />
        ) : (
          <>
            {error ? (
              <TouchableOpacity activeOpacity={0.84} style={styles.errorBanner} onPress={() => loadBillingData()}>
                <Feather name="alert-circle" size={rs(28)} color={palette.danger} />
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>Không tải được dữ liệu thanh toán</Text>
                  <Text style={styles.errorText} selectable>{error}</Text>
                </View>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            ) : null}

            {refreshing ? (
              <View style={styles.syncPill}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Text style={styles.syncText}>Đang đồng bộ ví và ưu đãi...</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
              <Text style={styles.sectionMeta}>{paymentMethods.length} mục</Text>
            </View>

            <View style={styles.methodList}>
              {paymentMethods.length ? (
                paymentMethods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    loading={actionMethodId === method.id}
                    onPress={() => handlePaymentMethodPress(method)}
                    onRemove={() => handleRemovePaymentMethod(method)}
                  />
                ))
              ) : (
                <EmptyCard title="Chưa có phương thức" description="GoRide sẽ luôn giữ tiền mặt làm phương thức dự phòng." />
              )}
            </View>

            <TouchableOpacity activeOpacity={0.82} disabled={addingMethod} style={styles.addMethod} onPress={handleAddPaymentMethod}>
              {addingMethod ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : (
                <Feather name="plus-circle" size={rs(34)} color={palette.primary} />
              )}
              <Text style={styles.addMethodText}>{addingMethod ? 'Đang kiểm tra' : 'Thêm phương thức thanh toán'}</Text>
            </TouchableOpacity>

            <View style={styles.couponHeader}>
              <View>
                <Text style={styles.sectionTitle}>Mã ưu đãi của tôi</Text>
                <Text style={styles.sectionSubtitle}>{availableVoucherCount} mã có thể dùng ngay</Text>
              </View>
              <TouchableOpacity activeOpacity={0.82} onPress={() => loadBillingData({ silent: true })}>
                <Text style={styles.viewAll}>Làm mới</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.couponList}>
              {vouchers.length ? (
                vouchers.map((voucher) => (
                  <VoucherCard key={voucher.id} voucher={voucher} onPress={() => handleVoucherPress(voucher)} />
                ))
              ) : (
                <EmptyCard title="Chưa có ưu đãi" description="Các voucher khả dụng sẽ xuất hiện ở đây khi backend trả dữ liệu." />
              )}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <NavItem icon="home-outline" label="Home" onPress={() => router.push('/(customer)')} />
        <NavItem icon="history" label="Activity" onPress={() => router.push('/(customer)/activity')} />
        <TouchableOpacity activeOpacity={0.84} style={styles.navActive}>
          <MaterialCommunityIcons name="cash-multiple" size={rs(34)} color="#9a8fee" />
          <Text style={styles.navActiveText}>Payment</Text>
        </TouchableOpacity>
        <NavItem
          icon="account-outline"
          label="Profile"
          onPress={() => router.push('/(customer)/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

type PaymentMethodProps = {
  loading: boolean;
  method: PassengerPaymentMethod;
  onPress: () => void;
  onRemove: () => void;
};

function PaymentMethodCard({ loading, method, onPress, onRemove }: PaymentMethodProps) {
  const icon = getPaymentIcon(method.method);
  const status = getPaymentStatusCopy(method);
  const removable = method.method !== 'CASH';

  return (
    <TouchableOpacity activeOpacity={0.84} style={styles.methodCard} onPress={onPress}>
      <View style={styles.methodIcon}>
        <MaterialCommunityIcons name={icon} size={rs(36)} color={palette.primary} />
      </View>

      <View style={styles.methodCopy}>
        <Text style={styles.methodTitle} selectable>{method.title}</Text>
        <Text style={[styles.methodDetail, { color: status.color }]} selectable>{status.detail}</Text>
      </View>

      <View style={styles.methodActions}>
        {loading ? (
          <ActivityIndicator color={palette.primary} size="small" />
        ) : method.isDefault ? (
          <View style={styles.defaultPill}>
            <Text style={styles.defaultText}>Mặc định</Text>
          </View>
        ) : method.status === 'ACTIVE' ? (
          <View style={styles.actionPill}>
            <Text style={styles.actionPillText}>Đặt mặc định</Text>
          </View>
        ) : (
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>Coming soon</Text>
          </View>
        )}

        {removable ? (
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={loading}
            style={[styles.removeMethodButton, loading && styles.removeMethodButtonDisabled]}
            onPress={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <Feather name="trash-2" size={rs(20)} color={palette.danger} />
            <Text style={styles.removeMethodText}>Xóa</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function VoucherCard({ voucher, onPress }: { voucher: PassengerVoucher; onPress: () => void }) {
  const status = getVoucherStatusCopy(voucher);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.couponCard, voucher.status !== 'AVAILABLE' && styles.couponCardMuted]}
    >
      <View style={styles.couponCopy}>
        <View style={styles.couponTitleRow}>
          <Text style={[styles.couponTitle, voucher.status !== 'AVAILABLE' && styles.couponTitleMuted]} selectable>{voucher.title}</Text>
          <View style={[styles.voucherStatusPill, { backgroundColor: status.backgroundColor }]}>
            <Text style={[styles.voucherStatusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={[styles.couponCode, voucher.status !== 'AVAILABLE' && styles.couponTextMuted]} selectable>{voucher.code}</Text>
        <Text style={[styles.couponDetail, voucher.status !== 'AVAILABLE' && styles.couponTextMuted]} selectable>{voucher.description}</Text>
        <Text style={[styles.couponMeta, voucher.status !== 'AVAILABLE' && styles.couponTextMuted]}>
          {formatVoucherMeta(voucher)}
        </Text>
      </View>

      <View style={[styles.useButton, voucher.status !== 'AVAILABLE' && styles.useButtonDisabled]}>
        <Text style={[styles.useButtonText, voucher.status !== 'AVAILABLE' && styles.useButtonTextDisabled]}>
          {voucher.status === 'AVAILABLE' ? 'Dùng' : 'Sau'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function BillingLoadingState() {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={palette.primary} size="large" />
      <Text style={styles.loadingTitle}>Đang tải ví GoRide</Text>
      <Text style={styles.loadingDescription}>Mình đang lấy phương thức thanh toán và mã ưu đãi mới nhất.</Text>
    </View>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyCard}>
      <Feather name="inbox" size={rs(30)} color={palette.primary} />
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyDescription}>{description}</Text>
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.navItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={rs(34)} color="#302d39" />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

function getPaymentIcon(method: PaymentMethod): keyof typeof MaterialCommunityIcons.glyphMap {
  if (method === 'MOMO') {
    return 'wallet-outline';
  }

  if (method === 'VNPAY') {
    return 'bank-transfer';
  }

  return 'cash';
}

function getPaymentStatusCopy(method: PassengerPaymentMethod) {
  if (method.status === 'COMING_SOON') {
    return {
      color: palette.amber,
      detail: method.detail || 'Sắp hỗ trợ',
    };
  }

  if (method.status === 'DISABLED') {
    return {
      color: palette.danger,
      detail: method.detail || 'Tạm khóa',
    };
  }

  return {
    color: method.linked ? palette.green : palette.muted,
    detail: method.detail,
  };
}

function getVoucherStatusCopy(voucher: PassengerVoucher) {
  if (voucher.status === 'AVAILABLE') {
    return { backgroundColor: '#e2f8ee', color: palette.green, label: 'Có thể dùng' };
  }

  if (voucher.status === 'COMING_SOON') {
    return { backgroundColor: palette.amberSoft, color: palette.amber, label: 'Coming soon' };
  }

  if (voucher.status === 'EXPIRED') {
    return { backgroundColor: palette.dangerSoft, color: palette.danger, label: 'Hết hạn' };
  }

  return { backgroundColor: palette.primarySoft, color: palette.primary, label: 'Đã dùng' };
}

function formatVoucherMeta(voucher: PassengerVoucher) {
  const parts = [
    voucher.minFare ? `Tối thiểu ${formatVnd(voucher.minFare)}` : undefined,
    voucher.maxDiscount ? `Tối đa ${formatVnd(voucher.maxDiscount)}` : undefined,
    voucher.expiresAt ? `HSD ${formatDate(voucher.expiresAt)}` : undefined,
  ].filter(Boolean);

  return parts.join(' · ') || 'Không giới hạn điều kiện';
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Vui lòng kiểm tra kết nối và thử lại.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingTop: rvs(28),
    paddingBottom: rvs(26),
  },
  header: {
    marginBottom: rvs(45),
    paddingHorizontal: rs(36),
    height: rs(70),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: rs(64),
    height: rs(64),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    color: palette.primary,
    fontSize: rf(48),
    lineHeight: rf(58),
    fontWeight: '800',
  },
  avatarWrap: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    backgroundColor: '#f0efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(12),
  },
  sectionHeader: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
  },
  sectionMeta: {
    color: palette.muted,
    fontSize: rf(21),
    lineHeight: rf(28),
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: rf(20),
    lineHeight: rf(27),
    fontWeight: '700',
    marginTop: rvs(4),
  },
  methodList: {
    paddingHorizontal: rs(36),
    gap: rs(16),
    marginBottom: rvs(16),
  },
  methodCard: {
    minHeight: rvs(147),
    borderRadius: rs(20),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: rs(29),
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  methodIcon: {
    width: rs(88),
    height: rs(88),
    borderRadius: rs(14),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(29),
  },
  methodCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  methodTitle: {
    color: palette.text,
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '700',
    marginBottom: 4,
  },
  methodDetail: {
    fontSize: rf(23),
    lineHeight: rf(31),
    fontWeight: '600',
  },
  methodActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: rvs(10),
    marginLeft: rs(12),
  },
  defaultPill: {
    borderRadius: rs(7),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(16),
    paddingVertical: rvs(10),
  },
  defaultText: {
    color: palette.primary,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '700',
  },
  actionPill: {
    borderRadius: rs(7),
    backgroundColor: '#e2f8ee',
    paddingHorizontal: rs(14),
    paddingVertical: rvs(9),
  },
  actionPillText: {
    color: palette.green,
    fontSize: rf(18),
    lineHeight: rf(25),
    fontWeight: '800',
  },
  comingSoonPill: {
    borderRadius: rs(7),
    backgroundColor: palette.amberSoft,
    paddingHorizontal: rs(14),
    paddingVertical: rvs(9),
  },
  comingSoonText: {
    color: palette.amber,
    fontSize: rf(18),
    lineHeight: rf(25),
    fontWeight: '800',
  },
  removeMethodButton: {
    minHeight: rvs(40),
    borderRadius: rs(13),
    paddingHorizontal: rs(13),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    backgroundColor: palette.dangerSoft,
  },
  removeMethodButtonDisabled: {
    opacity: 0.55,
  },
  removeMethodText: {
    color: palette.danger,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '900',
  },
  addMethod: {
    minHeight: rvs(103),
    marginHorizontal: rs(36),
    marginBottom: rvs(50),
    borderRadius: rs(20),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c9bedc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(18),
  },
  addMethodText: {
    color: palette.primary,
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '700',
  },
  couponHeader: {
    paddingHorizontal: rs(36),
    marginBottom: rvs(24),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAll: {
    color: palette.primary,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '700',
  },
  couponList: {
    gap: rvs(18),
    paddingHorizontal: rs(36),
  },
  couponCard: {
    minHeight: rvs(168),
    borderRadius: rs(21),
    backgroundColor: palette.primaryMid,
    paddingHorizontal: rs(28),
    paddingVertical: rvs(26),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1a0c75',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.27,
    shadowRadius: 10,
    elevation: 8,
  },
  couponCardMuted: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: palette.line,
  },
  couponCopy: {
    flex: 1,
    marginRight: rs(20),
  },
  couponTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    marginBottom: rvs(6),
  },
  couponTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: rf(28),
    lineHeight: rf(36),
    fontWeight: '900',
  },
  couponTitleMuted: {
    color: palette.text,
  },
  couponCode: {
    color: '#ffffff',
    fontSize: rf(22),
    lineHeight: rf(29),
    fontWeight: '800',
    marginBottom: rvs(5),
  },
  couponDetail: {
    color: '#ffffff',
    fontSize: rf(21),
    lineHeight: rf(29),
    fontWeight: '600',
    marginBottom: rvs(8),
  },
  couponMeta: {
    color: '#ffffff',
    fontSize: rf(17),
    lineHeight: rf(24),
    fontWeight: '700',
  },
  couponTextMuted: {
    color: palette.muted,
  },
  voucherStatusPill: {
    borderRadius: rs(14),
    paddingHorizontal: rs(10),
    paddingVertical: rvs(6),
  },
  voucherStatusText: {
    fontSize: rf(13),
    lineHeight: rf(18),
    fontWeight: '900',
  },
  useButton: {
    width: rs(120),
    height: rvs(62),
    borderRadius: rs(12),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonDisabled: {
    backgroundColor: palette.primarySoft,
  },
  useButtonText: {
    color: palette.primary,
    fontSize: rf(24),
    lineHeight: rf(31),
    fontWeight: '800',
  },
  useButtonTextDisabled: {
    color: palette.muted,
  },
  loadingState: {
    marginHorizontal: rs(36),
    minHeight: rvs(310),
    borderRadius: rs(28),
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rs(34),
    gap: rvs(12),
    ...shadow,
  },
  loadingTitle: {
    color: palette.text,
    fontSize: rf(28),
    lineHeight: rf(36),
    fontWeight: '900',
  },
  loadingDescription: {
    color: palette.muted,
    fontSize: rf(21),
    lineHeight: rf(29),
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    marginHorizontal: rs(36),
    marginBottom: rvs(26),
    borderRadius: rs(22),
    backgroundColor: palette.dangerSoft,
    padding: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
  },
  errorCopy: {
    flex: 1,
    gap: rvs(4),
  },
  errorTitle: {
    color: palette.danger,
    fontSize: rf(18),
    lineHeight: rf(25),
    fontWeight: '900',
  },
  errorText: {
    color: palette.danger,
    fontSize: rf(16),
    lineHeight: rf(23),
    fontWeight: '700',
  },
  retryText: {
    color: palette.danger,
    fontSize: rf(17),
    lineHeight: rf(24),
    fontWeight: '900',
  },
  syncPill: {
    alignSelf: 'center',
    minHeight: rvs(42),
    borderRadius: rs(22),
    backgroundColor: palette.primarySoft,
    paddingHorizontal: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    marginTop: rvs(-25),
    marginBottom: rvs(27),
  },
  syncText: {
    color: palette.primary,
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '800',
  },
  emptyCard: {
    minHeight: rvs(116),
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    padding: rs(22),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
  },
  emptyCopy: {
    flex: 1,
    gap: rvs(4),
  },
  emptyTitle: {
    color: palette.text,
    fontSize: rf(22),
    lineHeight: rf(30),
    fontWeight: '900',
  },
  emptyDescription: {
    color: palette.muted,
    fontSize: rf(18),
    lineHeight: rf(25),
    fontWeight: '600',
  },
  bottomSpacer: {
    height: rvs(200),
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: rvs(128),
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
    backgroundColor: palette.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: rvs(13),
    paddingHorizontal: rs(20),
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navActive: {
    width: rs(136),
    height: rvs(92),
    borderRadius: rs(46),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveText: {
    color: '#9a8fee',
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '600',
    marginTop: 2,
  },
  navItem: {
    minWidth: rs(100),
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#302d39',
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '500',
    marginTop: 5,
  },
});
