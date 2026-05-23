import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import type { BookingEstimate, LocationPoint } from '@/types/ride';

const palette = {
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  danger: '#d72828',
  dangerSoft: '#fff0f0',
  green: '#00b67a',
  greenSoft: '#dff8ef',
  amber: '#f59e0b',
  amberSoft: '#fff7df',
};

export type RoutePreviewProps = {
  pickup?: LocationPoint | null;
  dropoff?: LocationPoint | null;
  estimate?: BookingEstimate | null;
  estimatedDistance?: number | null;
  estimatedDuration?: number | null;
  estimatedFare?: number | null;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
  showFare?: boolean;
  paymentLabel?: string;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onRetry?: () => void;
};

export function RoutePreview({
  pickup = null,
  dropoff = null,
  estimate = null,
  estimatedDistance = null,
  estimatedDuration = null,
  estimatedFare = null,
  title = 'Lộ trình dự kiến',
  subtitle,
  loading = false,
  error = null,
  compact = false,
  showFare = true,
  paymentLabel = 'Tiền mặt',
  footer,
  style,
  onRetry,
}: RoutePreviewProps) {
  const distance = estimate?.estimatedDistance ?? estimatedDistance;
  const duration = estimate?.estimatedDuration ?? estimatedDuration;
  const fare = estimate?.estimatedFare ?? estimatedFare;
  const hasRoute = Boolean(pickup && dropoff);

  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="map-marker-path" size={rs(30)} color={palette.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={styles.loadingText}>Đang tính</Text>
          </View>
        ) : (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={rs(24)} color={palette.danger} />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.routeBody}>
        <RoutePointRow
          tone="pickup"
          label="Điểm đón"
          point={pickup}
          placeholder="Chưa chọn điểm đón"
          showConnector
        />
        <RoutePointRow
          tone="dropoff"
          label="Điểm đến"
          point={dropoff}
          placeholder="Chưa chọn điểm đến"
        />
      </View>

      <View style={[styles.metricsGrid, compact && styles.metricsGridCompact]}>
        <MetricPill
          icon="map-outline"
          label="Khoảng cách"
          value={formatDistance(distance)}
          muted={!distance}
        />
        <MetricPill
          icon="time-outline"
          label="Thời gian"
          value={formatDuration(duration)}
          muted={!duration}
        />
        {showFare && (
          <MetricPill
            icon="cash-outline"
            label="Giá ước tính"
            value={formatFare(fare)}
            muted={!fare}
            highlight
          />
        )}
      </View>

      {showFare && (
        <View style={styles.paymentRow}>
          <View style={styles.paymentIcon}>
            <MaterialCommunityIcons name="cash" size={rs(24)} color={palette.green} />
          </View>
          <Text style={styles.paymentText}>Thanh toán: {paymentLabel}</Text>
          {!hasRoute && <Text style={styles.routeHint}>Chọn đủ 2 điểm để tính giá</Text>}
        </View>
      )}

      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

function RoutePointRow({
  tone,
  label,
  point,
  placeholder,
  showConnector = false,
}: {
  tone: 'pickup' | 'dropoff';
  label: string;
  point?: LocationPoint | null;
  placeholder: string;
  showConnector?: boolean;
}) {
  const color = tone === 'pickup' ? palette.primary : palette.danger;

  return (
    <View style={styles.pointRow}>
      <View style={styles.pointRail}>
        <View style={[styles.pointDot, { backgroundColor: color }]} />
        {showConnector && <View style={styles.pointConnector} />}
      </View>
      <View style={styles.pointCopy}>
        <Text style={styles.pointLabel}>{label}</Text>
        <Text style={[styles.pointAddress, !point && styles.placeholderText]} numberOfLines={2}>
          {point?.address ?? point?.label ?? placeholder}
        </Text>
      </View>
    </View>
  );
}

function MetricPill({
  icon,
  label,
  value,
  muted = false,
  highlight = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.metricPill, highlight && styles.metricPillHighlight]}>
      <Ionicons name={icon} size={rs(24)} color={highlight ? palette.green : palette.primary} />
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, muted && styles.metricMuted, highlight && styles.metricHighlight]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function formatDistance(distance?: number | null) {
  if (!distance || distance <= 0) {
    return '-- km';
  }

  return `${distance.toFixed(distance < 10 ? 1 : 0)} km`;
}

function formatDuration(duration?: number | null) {
  if (!duration || duration <= 0) {
    return '-- phút';
  }

  if (duration < 60) {
    return `${Math.round(duration)} phút`;
  }

  const hours = Math.floor(duration / 60);
  const minutes = Math.round(duration % 60);
  return minutes ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

function formatFare(fare?: number | null) {
  if (!fare || fare <= 0) {
    return '-- đ';
  }

  return `${Math.round(fare).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 24,
  elevation: 7,
};

const styles = StyleSheet.create({
  card: {
    gap: rvs(24),
    padding: rs(30),
    borderRadius: rs(38),
    backgroundColor: palette.card,
    ...shadow,
  },
  cardCompact: {
    gap: rvs(18),
    padding: rs(24),
    borderRadius: rs(30),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(14),
    paddingBottom: rvs(22),
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
  },
  headerIcon: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  headerCopy: {
    flex: 1,
    gap: rvs(3),
  },
  title: {
    color: palette.text,
    fontSize: rf(24),
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(16),
    lineHeight: rf(22),
  },
  distanceBadge: {
    paddingHorizontal: rs(18),
    paddingVertical: rvs(9),
    borderRadius: rs(16),
    backgroundColor: palette.primarySoft,
  },
  distanceText: {
    color: palette.primary,
    fontSize: rf(22),
    fontWeight: '800',
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(9),
    borderRadius: rs(16),
    backgroundColor: palette.primarySoft,
  },
  loadingText: {
    color: palette.primary,
    fontSize: rf(16),
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    padding: rs(16),
    borderRadius: rs(22),
    backgroundColor: palette.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: palette.danger,
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '700',
  },
  retryButton: {
    paddingHorizontal: rs(14),
    height: rvs(38),
    borderRadius: rs(19),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
  },
  retryText: {
    color: palette.danger,
    fontSize: rf(15),
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  routeBody: {
    gap: rvs(10),
  },
  pointRow: {
    flexDirection: 'row',
    minHeight: rvs(64),
  },
  pointRail: {
    width: rs(42),
    alignItems: 'center',
  },
  pointDot: {
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    marginTop: rvs(5),
  },
  pointConnector: {
    flex: 1,
    width: 2,
    marginVertical: rvs(6),
    backgroundColor: palette.line,
  },
  pointCopy: {
    flex: 1,
    gap: rvs(4),
  },
  pointLabel: {
    color: palette.muted,
    fontSize: rf(17),
    fontWeight: '700',
  },
  pointAddress: {
    color: palette.text,
    fontSize: rf(20),
    lineHeight: rf(27),
    fontWeight: '800',
  },
  placeholderText: {
    color: palette.muted,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: rs(12),
  },
  metricsGridCompact: {
    flexWrap: 'wrap',
  },
  metricPill: {
    flex: 1,
    minWidth: rs(150),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingHorizontal: rs(14),
    paddingVertical: rvs(14),
    borderRadius: rs(22),
    backgroundColor: palette.primarySoft,
  },
  metricPillHighlight: {
    backgroundColor: palette.greenSoft,
  },
  metricCopy: {
    flex: 1,
    gap: rvs(2),
  },
  metricLabel: {
    color: palette.muted,
    fontSize: rf(14),
    fontWeight: '700',
  },
  metricValue: {
    color: palette.primary,
    fontSize: rf(18),
    fontWeight: '900',
  },
  metricMuted: {
    color: palette.muted,
  },
  metricHighlight: {
    color: palette.green,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingTop: rvs(4),
  },
  paymentIcon: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.greenSoft,
  },
  paymentText: {
    color: palette.text,
    fontSize: rf(18),
    fontWeight: '800',
  },
  routeHint: {
    flex: 1,
    color: palette.amber,
    fontSize: rf(15),
    fontWeight: '700',
    textAlign: 'right',
  },
  footer: {
    paddingTop: rvs(6),
  },
});
