import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import type { TripStatus } from '@/types/ride';

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

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 24,
  elevation: 7,
};

type TimelineStep = {
  status: Exclude<TripStatus, 'CANCELLED' | 'NO_DRIVER'>;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const steps: TimelineStep[] = [
  {
    status: 'SEARCHING',
    title: 'Đang tìm tài xế',
    description: 'GoRide gửi yêu cầu tới tài xế gần bạn.',
    icon: 'radar',
  },
  {
    status: 'ACCEPTED',
    title: 'Tài xế đã nhận',
    description: 'Thông tin tài xế và vị trí sẽ được cập nhật.',
    icon: 'account-check-outline',
  },
  {
    status: 'ARRIVED',
    title: 'Tài xế đã đến',
    description: 'Kiểm tra biển số và lên xe an toàn.',
    icon: 'map-marker-check-outline',
  },
  {
    status: 'IN_PROGRESS',
    title: 'Đang di chuyển',
    description: 'Chuyến đi đang được theo dõi realtime.',
    icon: 'car-clock',
  },
  {
    status: 'COMPLETED',
    title: 'Hoàn thành',
    description: 'Chuyến đi kết thúc và đồng bộ hóa đơn.',
    icon: 'flag-checkered',
  },
];

export type TripStatusTimelineProps = {
  status: TripStatus;
  lastUpdatedAt?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function TripStatusTimeline({ status, lastUpdatedAt = null, style }: TripStatusTimelineProps) {
  const activeIndex = getActiveIndex(status);
  const interrupted = status === 'CANCELLED' || status === 'NO_DRIVER';

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="timeline-clock-outline" size={rs(26)} color={palette.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Tiến trình chuyến đi</Text>
          <Text style={styles.subtitle}>{formatLastUpdated(lastUpdatedAt)}</Text>
        </View>
      </View>

      {interrupted ? <InterruptedBanner status={status} /> : null}

      <View style={styles.timeline}>
        {steps.map((step, index) => {
          const state = getStepState(index, activeIndex, interrupted);
          const isLast = index === steps.length - 1;

          return <TimelineRow key={step.status} step={step} state={state} isLast={isLast} />;
        })}
      </View>
    </View>
  );
}

function TimelineRow({
  step,
  state,
  isLast,
}: {
  step: TimelineStep;
  state: 'done' | 'active' | 'upcoming' | 'muted';
  isLast: boolean;
}) {
  const active = state === 'active';
  const done = state === 'done';
  const muted = state === 'muted';
  const color = muted ? palette.muted : active || done ? palette.green : palette.primaryMid;

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepRail}>
        <View
          style={[
            styles.stepCircle,
            done && styles.stepCircleDone,
            active && styles.stepCircleActive,
            muted && styles.stepCircleMuted,
          ]}
        >
          <MaterialCommunityIcons name={done ? 'check-bold' : step.icon} size={rs(20)} color={done ? palette.card : color} />
        </View>
        {!isLast ? <View style={[styles.stepLine, (done || active) && styles.stepLineDone, muted && styles.stepLineMuted]} /> : null}
      </View>

      <View style={[styles.stepCopy, muted && styles.stepCopyMuted]}>
        <Text style={[styles.stepTitle, active && styles.stepTitleActive, muted && styles.stepTextMuted]}>{step.title}</Text>
        <Text style={[styles.stepDescription, muted && styles.stepTextMuted]}>{step.description}</Text>
        {active ? <Text style={styles.activeLabel}>Đang ở bước này</Text> : null}
      </View>
    </View>
  );
}

function InterruptedBanner({ status }: { status: TripStatus }) {
  const isCancelled = status === 'CANCELLED';

  return (
    <View style={[styles.interruptedBanner, isCancelled ? styles.cancelledBanner : styles.noDriverBanner]}>
      <MaterialCommunityIcons
        name={isCancelled ? 'close-circle-outline' : 'account-search-outline'}
        size={rs(24)}
        color={isCancelled ? palette.danger : palette.amber}
      />
      <Text style={[styles.interruptedText, { color: isCancelled ? palette.danger : palette.amber }]}>
        {isCancelled ? 'Chuyến đi đã hủy. Timeline được giữ lại để đối soát.' : 'Chưa tìm thấy tài xế phù hợp cho chuyến này.'}
      </Text>
    </View>
  );
}

function getActiveIndex(status: TripStatus) {
  const index = steps.findIndex((step) => step.status === status);
  return index >= 0 ? index : 0;
}

function getStepState(index: number, activeIndex: number, interrupted: boolean) {
  if (interrupted) {
    return index === 0 ? 'active' : 'muted';
  }

  if (index < activeIndex) {
    return 'done';
  }

  if (index === activeIndex) {
    return 'active';
  }

  return 'upcoming';
}

function formatLastUpdated(value?: string | null) {
  if (!value) {
    return 'Cập nhật theo realtime và fallback GPS';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Cập nhật lúc ' + value;
  }

  return (
    'Cập nhật lúc ' +
    date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: rs(36),
    padding: rs(22),
    gap: rvs(18),
    ...shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  headerIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(18),
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: rvs(3),
  },
  title: {
    color: palette.text,
    fontSize: rf(24),
    fontWeight: '900',
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '800',
  },
  interruptedBanner: {
    minHeight: rvs(54),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(9),
    padding: rs(12),
    borderRadius: rs(20),
  },
  cancelledBanner: {
    backgroundColor: palette.dangerSoft,
  },
  noDriverBanner: {
    backgroundColor: palette.amberSoft,
  },
  interruptedText: {
    flex: 1,
    fontSize: rf(15),
    fontWeight: '900',
    lineHeight: rf(21),
  },
  timeline: {
    gap: rvs(2),
  },
  stepRow: {
    flexDirection: 'row',
    gap: rs(14),
  },
  stepRail: {
    width: rs(44),
    alignItems: 'center',
  },
  stepCircle: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: '#e0d8f4',
  },
  stepCircleDone: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  stepCircleActive: {
    backgroundColor: palette.greenSoft,
    borderColor: palette.green,
    borderWidth: 2,
  },
  stepCircleMuted: {
    backgroundColor: '#f4f1f5',
    borderColor: palette.line,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: rvs(34),
    backgroundColor: palette.line,
  },
  stepLineDone: {
    backgroundColor: palette.green,
  },
  stepLineMuted: {
    backgroundColor: '#efecf1',
  },
  stepCopy: {
    flex: 1,
    minHeight: rvs(76),
    paddingBottom: rvs(12),
    gap: rvs(3),
  },
  stepCopyMuted: {
    opacity: 0.62,
  },
  stepTitle: {
    color: palette.text,
    fontSize: rf(18),
    fontWeight: '900',
  },
  stepTitleActive: {
    color: palette.green,
  },
  stepDescription: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '700',
    lineHeight: rf(21),
  },
  stepTextMuted: {
    color: palette.muted,
  },
  activeLabel: {
    alignSelf: 'flex-start',
    marginTop: rvs(3),
    paddingHorizontal: rs(9),
    paddingVertical: rvs(4),
    borderRadius: rs(12),
    overflow: 'hidden',
    backgroundColor: palette.greenSoft,
    color: palette.green,
    fontSize: rf(13),
    fontWeight: '900',
  },
});
