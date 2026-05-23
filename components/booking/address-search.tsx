import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  type TextInputProps,
} from 'react-native';

import { rf, rs, rvs } from '@/constants/responsive';
import { HAS_GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { getPlaceDetails, searchPlaces } from '@/lib/location-service';
import type { Coordinates, LocationPoint } from '@/types/ride';

const palette = {
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  danger: '#d72828',
  green: '#00b67a',
  greenSoft: '#dff8ef',
};

export type AddressSearchProps = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (point: LocationPoint) => void;
  searchBias?: Coordinates | null;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minQueryLength?: number;
  debounceMs?: number;
  autoCollapseOnSelect?: boolean;
  style?: StyleProp<ViewStyle>;
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder'>;
};

export function AddressSearch({
  placeholder = 'Nhập địa chỉ hoặc địa điểm',
  value,
  onChangeText,
  onSelect,
  searchBias = null,
  label,
  helperText,
  disabled = false,
  autoFocus = false,
  minQueryLength = 2,
  debounceMs = 350,
  autoCollapseOnSelect = true,
  style,
  inputProps,
}: AddressSearchProps) {
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [collapsedAfterSelect, setCollapsedAfterSelect] = useState(false);
  const requestIdRef = useRef(0);

  const trimmedValue = value.trim();
  const biasLat = searchBias?.lat;
  const biasLng = searchBias?.lng;
  const canSearch = !disabled && trimmedValue.length >= minQueryLength;
  const hasPartialQuery = focused && trimmedValue.length > 0;
  const showResults =
    !collapsedAfterSelect &&
    (focused || results.length > 0 || loading || Boolean(error)) &&
    (canSearch || hasSearched || hasPartialQuery || Boolean(error));

  const providerHint = useMemo(() => {
    if (helperText) {
      return helperText;
    }

    return HAS_GOOGLE_MAPS_API_KEY
      ? 'Tìm kiếm bằng Google Places, ưu tiên khu vực gần bạn.'
      : 'Đang dùng tìm kiếm giới hạn vì chưa có Google Maps API key.';
  }, [helperText]);

  useEffect(() => {
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    if (!canSearch) {
      setResults([]);
      setError(null);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const bias = biasLat !== undefined && biasLng !== undefined ? { lat: biasLat, lng: biasLng } : undefined;
        const places = await searchPlaces(trimmedValue, bias);

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        setResults(places);
        setHasSearched(true);
      } catch (searchError) {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        setResults([]);
        setHasSearched(true);
        setError(searchError instanceof Error ? searchError.message : 'Không thể tìm địa chỉ');
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [biasLat, biasLng, canSearch, debounceMs, trimmedValue]);

  const handleChangeText = (text: string) => {
    setCollapsedAfterSelect(false);
    onChangeText(text);
  };

  const handleSelect = async (point: LocationPoint) => {
    setError(null);

    if (point.placeId) {
      setSelectingPlaceId(point.placeId);
    }

    try {
      const resolvedPoint = point.placeId ? (await getPlaceDetails(point.placeId)) ?? point : point;
      onSelect(resolvedPoint);
      onChangeText(resolvedPoint.label ?? resolvedPoint.address);

      if (autoCollapseOnSelect) {
        setCollapsedAfterSelect(true);
        setResults([]);
        Keyboard.dismiss();
      }
    } catch (detailsError) {
      setError(detailsError instanceof Error ? detailsError.message : 'Không thể lấy chi tiết địa điểm');
    } finally {
      setSelectingPlaceId(null);
    }
  };

  const handleClear = () => {
    setCollapsedAfterSelect(false);
    setResults([]);
    setError(null);
    setHasSearched(false);
    onChangeText('');
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, disabled && styles.inputWrapDisabled]}>
        <Ionicons name="search" size={rs(28)} color={focused ? palette.primary : palette.muted} />
        <TextInput
          {...inputProps}
          value={value}
          editable={!disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          returnKeyType="search"
          style={styles.input}
          onChangeText={handleChangeText}
          onFocus={(event) => {
            setFocused(true);
            inputProps?.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps?.onBlur?.(event);
          }}
        />
        {loading ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa địa chỉ"
            hitSlop={rs(10)}
            onPress={handleClear}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={rs(24)} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.hintRow}>
        <Ionicons
          name={HAS_GOOGLE_MAPS_API_KEY ? 'sparkles-outline' : 'information-circle-outline'}
          size={rs(20)}
          color={HAS_GOOGLE_MAPS_API_KEY ? palette.primaryMid : palette.muted}
        />
        <Text style={styles.helperText}>{providerHint}</Text>
      </View>

      {showResults && (
        <View style={styles.resultsCard}>
          {error ? (
            <StateRow
              icon="warning-outline"
              title="Không tìm được địa chỉ"
              message={error}
              tone="danger"
            />
          ) : !canSearch ? (
            <StateRow
              icon="text-outline"
              title="Nhập thêm địa chỉ"
              message={`Nhập ít nhất ${minQueryLength} ký tự để bắt đầu tìm kiếm.`}
            />
          ) : loading && results.length === 0 ? (
            <StateRow icon="navigate-outline" title="Đang tìm kiếm" message="GoRide đang gợi ý địa điểm gần bạn." />
          ) : hasSearched && results.length === 0 ? (
            <StateRow
              icon="map-outline"
              title="Chưa có kết quả"
              message="Thử nhập tên đường, tòa nhà hoặc quận gần hơn."
            />
          ) : (
            results.map((point) => (
              <ResultRow
                key={`${point.placeId ?? point.address}-${point.lat}-${point.lng}`}
                point={point}
                loading={selectingPlaceId === point.placeId}
                onPress={() => handleSelect(point)}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

function ResultRow({
  point,
  loading,
  onPress,
}: {
  point: LocationPoint;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chọn ${point.label ?? point.address}`}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
    >
      <View style={styles.resultIcon}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : (
          <Ionicons name="location-outline" size={rs(24)} color={palette.primary} />
        )}
      </View>
      <View style={styles.resultCopy}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {point.label ?? point.address}
        </Text>
        <Text style={styles.resultAddress} numberOfLines={2}>
          {point.address}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={rs(22)} color={palette.muted} />
    </Pressable>
  );
}

function StateRow({
  icon,
  title,
  message,
  tone = 'muted',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  tone?: 'muted' | 'danger';
}) {
  const color = tone === 'danger' ? palette.danger : palette.muted;

  return (
    <View style={styles.stateRow}>
      <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
        <Ionicons name={icon} size={rs(24)} color={color} />
      </View>
      <View style={styles.resultCopy}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.resultAddress}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: rvs(10),
  },
  label: {
    color: palette.text,
    fontSize: rf(20),
    fontWeight: '800',
  },
  inputWrap: {
    minHeight: rvs(66),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    paddingHorizontal: rs(18),
    borderRadius: rs(28),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    shadowColor: '#7c6da8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
  },
  inputWrapFocused: {
    borderColor: palette.primary,
    shadowOpacity: 0.16,
  },
  inputWrapDisabled: {
    opacity: 0.62,
  },
  input: {
    flex: 1,
    minHeight: rvs(58),
    color: palette.text,
    fontSize: rf(20),
    fontWeight: '700',
  },
  clearButton: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(17),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(8),
  },
  helperText: {
    flex: 1,
    color: palette.muted,
    fontSize: rf(16),
    lineHeight: rf(22),
  },
  resultsCard: {
    overflow: 'hidden',
    borderRadius: rs(28),
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    shadowColor: '#7c6da8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  resultRow: {
    minHeight: rvs(84),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingVertical: rvs(14),
    paddingHorizontal: rs(16),
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  resultRowPressed: {
    backgroundColor: palette.primarySoft,
  },
  resultIcon: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  resultCopy: {
    flex: 1,
    gap: rvs(4),
  },
  resultTitle: {
    color: palette.text,
    fontSize: rf(19),
    fontWeight: '800',
  },
  resultAddress: {
    color: palette.muted,
    fontSize: rf(16),
    lineHeight: rf(22),
  },
  stateRow: {
    minHeight: rvs(90),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingVertical: rvs(16),
    paddingHorizontal: rs(16),
  },
  stateIcon: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  stateIconDanger: {
    backgroundColor: '#fff0f0',
  },
  stateTitle: {
    color: palette.text,
    fontSize: rf(18),
    fontWeight: '800',
  },
});
