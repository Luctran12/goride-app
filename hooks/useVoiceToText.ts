import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { normalizeSpokenThreeWords } from '@/lib/three-word-normalizer';

// Lazy-load expo-speech-recognition to avoid crashing in Expo Go
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExpoSpeechModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let useSpeechEvent: any = null;
let nativeAvailable = false;

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechModule = mod.ExpoSpeechRecognitionModule;
  useSpeechEvent = mod.useSpeechRecognitionEvent;
  // Quick check: if the module object exists and has start method, native is available
  if (ExpoSpeechModule && typeof ExpoSpeechModule.start === 'function') {
    nativeAvailable = true;
  }
} catch {
  nativeAvailable = false;
}

export interface UseVoiceToTextReturn {
  isListening: boolean;
  transcript: string;
  normalizedResult: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Hook using native expo-speech-recognition when available (dev build),
 * falling back to Web Speech API on web, or showing an unsupported message.
 */
export function useVoiceToText(): UseVoiceToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Determine if any speech API is supported
  const webSpeechAvailable =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const isSupported = nativeAvailable || webSpeechAvailable;

  // --- Native expo-speech-recognition event listeners (only if available) ---
  // These hooks must be called unconditionally (Rules of Hooks), but they
  // are no-ops when useSpeechEvent is null.
  const noopHook = (_name: string, _cb: unknown) => {};
  const useEvent = useSpeechEvent ?? noopHook;

  useEvent('start', () => {
    setIsListening(true);
  });

  useEvent('end', () => {
    setIsListening(false);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useEvent('result', (event: any) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useEvent('error', (event: any) => {
    const code = event.error;
    let message = 'Lỗi nhận diện giọng nói.';
    if (code === 'no-speech') {
      message = 'Chưa nghe thấy giọng nói. Vui lòng thử lại.';
    } else if (code === 'audio-capture') {
      message = 'Không thể truy cập micro. Kiểm tra quyền micro trong cài đặt.';
    } else if (code === 'not-allowed') {
      message = 'Quyền nhận diện giọng nói bị từ chối. Cho phép trong cài đặt.';
    } else if (code === 'network') {
      message = 'Lỗi mạng khi nhận diện giọng nói. Kiểm tra kết nối.';
    }
    setError(message);
    setIsListening(false);
  });

  // --- Web Speech API fallback (only on web) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRecognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!nativeAvailable && webSpeechAvailable && typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (ev: any) => {
          let currentTranscript = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            currentTranscript += ev.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (ev: any) => {
          setError(
            ev.error === 'no-speech'
              ? 'Chưa nghe thấy giọng nói. Vui lòng thử lại.'
              : 'Lỗi nhận diện giọng nói.',
          );
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        webRecognitionRef.current = recognition;
      }
    }
  }, [nativeAvailable, webSpeechAvailable]);

  // --- Start / Stop ---
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');

    if (nativeAvailable && ExpoSpeechModule) {
      // Native path
      const permResult = await ExpoSpeechModule.requestPermissionsAsync();
      if (!permResult.granted) {
        setError('Bạn cần cho phép quyền micro và nhận diện giọng nói để sử dụng tính năng này.');
        return;
      }
      ExpoSpeechModule.start({ lang: 'vi-VN', interimResults: true });
    } else if (webRecognitionRef.current) {
      // Web fallback
      setIsListening(true);
      try {
        webRecognitionRef.current.start();
      } catch {
        // Already started
      }
    } else {
      setError(
        'Nhận diện giọng nói chưa khả dụng trên Expo Go.\n' +
        'Vui lòng build app native (npx expo run:android) hoặc nhập 3 từ bằng bàn phím.',
      );
    }
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (nativeAvailable && ExpoSpeechModule) {
      ExpoSpeechModule.stop();
    } else if (webRecognitionRef.current) {
      try {
        webRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setIsListening(false);
  }, []);

  const normalizedResult = normalizeSpokenThreeWords(transcript);

  return {
    isListening,
    transcript,
    normalizedResult,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
