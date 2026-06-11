import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { reportError } from '@/lib/error-reporting';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    void reportError({
      error,
      fatal: false,
      metadata: {
        componentStack: errorInfo.componentStack ?? undefined,
      },
      source: 'react-error-boundary',
    });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>GoRide đang tự kiểm tra lỗi</Text>
          <Text style={styles.title}>Có lỗi xảy ra trên màn hình này</Text>
          <Text style={styles.description}>
            Mình đã ghi nhận lỗi để đội phát triển kiểm tra. Bạn có thể thử tải lại màn hình.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => this.setState({ error: null })}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffaf0',
    borderColor: '#f8d48a',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#1b1407',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#f0b84d',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  description: {
    color: '#5f4d2a',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 20,
  },
  eyebrow: {
    color: '#9a6700',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    color: '#1f2937',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
    marginBottom: 10,
  },
});
