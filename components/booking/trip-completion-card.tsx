import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import { submitTripRating } from '@/lib/ride-api';
import type { TripRating } from '@/types/ride';

const palette = {
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
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

export type TripCompletionCardProps = {
  visible: boolean;
  tripId?: string;
  driverName?: string;
  fare: number | null;
  estimatedFare: number | null;
  distance: number | null;
  duration: number | null;
  paymentLabel: string;
  promoCode?: string;
  completedAt?: string | null;
  onRatingSubmitted?: (rating: TripRating) => void;
};

const ratingTags = ['Lái xe an toàn', 'Đúng giờ', 'Thân thiện', 'Xe sạch'];

export function TripCompletionCard({
  visible,
  tripId,
  driverName,
  fare,
  estimatedFare,
  distance,
  duration,
  paymentLabel,
  promoCode,
  completedAt,
  onRatingSubmitted,
}: TripCompletionCardProps) {
  const [rating, setRating] = useState(5);
  const [selectedTag, setSelectedTag] = useState(ratingTags[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRating, setSubmittedRating] = useState<TripRating | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const receiptRows = useMemo(
    () => [
      { label: 'Tổng tiền', value: formatFare(fare ?? estimatedFare), highlight: true },
      { label: 'Phương thức', value: paymentLabel },
      { label: 'Quãng đường', value: formatDistance(distance) },
      { label: 'Thời gian', value: formatDuration(duration) },
      { label: 'Ưu đãi', value: promoCode ?? 'Không áp dụng' },
      { label: 'Hoàn thành', value: formatDateTime(completedAt) },
    ],
    [completedAt, distance, duration, estimatedFare, fare, paymentLabel, promoCode],
  );

  useEffect(() => {
    setRating(5);
    setSelectedTag(ratingTags[0]);
    setSubmitting(false);
    setSubmittedRating(null);
    setSubmitError(null);
  }, [tripId]);

  if (!visible) {
    return null;
  }

  const handleSubmit = async () => {
    if (submitting || submittedRating) {
      return;
    }

    const numericTripId = Number(tripId);

    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      setSubmitError('Mã chuyến chưa hợp lệ, vui lòng đồng bộ lại chuyến đi trước khi đánh giá.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await submitTripRating({
        tripId: numericTripId,
        score: rating,
        comment: selectedTag,
      });
      const nextRating = {
        score: response.score,
        comment: selectedTag,
        tags: [selectedTag],
        createdAt: new Date().toISOString(),
      };

      setSubmittedRating(nextRating);
      onRatingSubmitted?.(nextRating);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể gửi đánh giá lúc này.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="receipt-text-check-outline" size={rs(32)} color={palette.green} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Hoàn tất chuyến đi</Text>
          <Text style={styles.title}>Hóa đơn tạm tính & đánh giá</Text>
          <Text style={styles.subtitle}>
            {driverName ? `Cảm ơn bạn đã đi cùng ${driverName}.` : 'Cảm ơn bạn đã sử dụng GoRide.'}
          </Text>
        </View>
      </View>

      <View style={styles.receiptBox}>
        {receiptRows.map((row) => (
          <View key={row.label} style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>{row.label}</Text>
            <Text style={[styles.receiptValue, row.highlight && styles.receiptValueHighlight]} selectable>
              {row.value}
            </Text>
          </View>
        ))}
        <Text style={styles.receiptNote}>
          Mã chuyến {tripId ? `#${tripId}` : 'đang đồng bộ'} sẽ dùng để đối soát thanh toán khi backend trả hóa đơn
          thật.
        </Text>
      </View>

      <View style={styles.ratingBox}>
        <View style={styles.ratingHeader}>
          <Text style={styles.ratingTitle}>Bạn đánh giá chuyến này thế nào?</Text>
          <Text style={styles.ratingScore}>{submittedRating?.score ?? rating}/5</Text>
        </View>

        {submittedRating ? (
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-bold" size={rs(24)} color={palette.card} />
            </View>
            <View style={styles.successCopy}>
              <Text style={styles.successTitle}>Đã gửi đánh giá</Text>
              <Text style={styles.successText}>
                Cảm ơn bạn đã phản hồi {submittedRating.score}/5 sao cho chuyến đi này.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((score) => (
                <TouchableOpacity
                  key={score}
                  activeOpacity={0.78}
                  disabled={submitting}
                  onPress={() => setRating(score)}
                >
                  <MaterialCommunityIcons
                    name={score <= rating ? 'star' : 'star-outline'}
                    size={rs(38)}
                    color={palette.amber}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tagRow}>
              {ratingTags.map((tag) => {
                const selected = selectedTag === tag;

                return (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={0.8}
                    disabled={submitting}
                    style={[styles.tagChip, selected && styles.tagChipSelected]}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {submitError ? (
              <Text style={styles.errorText} selectable>
                {submitError}
              </Text>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.84}
              disabled={submitting}
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator color={palette.card} />
              ) : (
                <MaterialCommunityIcons name="send-check-outline" size={rs(24)} color={palette.card} />
              )}
              <Text style={styles.submitText}>{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function formatFare(value: number | null) {
  if (!value || value <= 0) {
    return '-- đ';
  }

  return Math.round(value).toLocaleString('vi-VN') + 'đ';
}

function formatDistance(distance: number | null) {
  if (!distance || distance <= 0) {
    return '-- km';
  }

  return distance.toFixed(distance < 10 ? 1 : 0) + ' km';
}

function formatDuration(duration: number | null) {
  if (!duration || duration <= 0) {
    return '-- phút';
  }

  if (duration < 60) {
    return Math.round(duration) + ' phút';
  }

  const hours = Math.floor(duration / 60);
  const minutes = Math.round(duration % 60);
  return minutes ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Đang đồng bộ';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

const styles = StyleSheet.create({
  card: {
    padding: rs(20),
    borderRadius: rs(36),
    backgroundColor: palette.card,
    gap: rvs(18),
    ...shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
  },
  iconBox: {
    width: rs(58),
    height: rs(58),
    borderRadius: rs(20),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: rvs(4),
  },
  eyebrow: {
    color: palette.green,
    fontSize: rf(15),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    color: palette.text,
    fontSize: rf(25),
    fontWeight: '900',
    lineHeight: rf(31),
  },
  subtitle: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '700',
    lineHeight: rf(23),
  },
  receiptBox: {
    padding: rs(16),
    borderRadius: rs(26),
    backgroundColor: '#f8f6fb',
    gap: rvs(12),
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  receiptLabel: {
    color: palette.muted,
    fontSize: rf(16),
    fontWeight: '800',
  },
  receiptValue: {
    flex: 1,
    color: palette.text,
    fontSize: rf(17),
    fontWeight: '900',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  receiptValueHighlight: {
    color: palette.green,
    fontSize: rf(22),
  },
  receiptNote: {
    paddingTop: rvs(8),
    borderTopWidth: 1,
    borderTopColor: palette.line,
    color: palette.primaryMid,
    fontSize: rf(14),
    fontWeight: '700',
    lineHeight: rf(20),
  },
  ratingBox: {
    padding: rs(16),
    borderRadius: rs(28),
    backgroundColor: palette.amberSoft,
    gap: rvs(14),
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(12),
  },
  ratingTitle: {
    flex: 1,
    color: palette.text,
    fontSize: rf(19),
    fontWeight: '900',
    lineHeight: rf(25),
  },
  ratingScore: {
    color: palette.amber,
    fontSize: rf(22),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(8),
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  tagChip: {
    paddingHorizontal: rs(12),
    paddingVertical: rvs(8),
    borderRadius: rs(999),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: '#f5dc9a',
  },
  tagChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  tagText: {
    color: palette.amber,
    fontSize: rf(14),
    fontWeight: '900',
  },
  tagTextSelected: {
    color: palette.card,
  },
  errorText: {
    padding: rs(12),
    borderRadius: rs(16),
    backgroundColor: '#fff1f2',
    color: '#be123c',
    fontSize: rf(14),
    fontWeight: '800',
    lineHeight: rf(20),
  },
  successBox: {
    padding: rs(14),
    borderRadius: rs(20),
    backgroundColor: palette.greenSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  successIcon: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(14),
    backgroundColor: palette.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCopy: {
    flex: 1,
    gap: rvs(3),
  },
  successTitle: {
    color: palette.text,
    fontSize: rf(17),
    fontWeight: '900',
  },
  successText: {
    color: palette.muted,
    fontSize: rf(15),
    fontWeight: '700',
    lineHeight: rf(21),
  },
  submitButton: {
    minHeight: rvs(58),
    borderRadius: rs(20),
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitText: {
    color: palette.card,
    fontSize: rf(18),
    fontWeight: '900',
  },
});
