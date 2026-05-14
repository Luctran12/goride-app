import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

const DESIGN_WIDTH = 768;
const DESIGN_HEIGHT = 1024;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(PixelRatio.roundToNearestPixel(value));
}

const widthScale = clamp(width / DESIGN_WIDTH, 0.5, 1.08);
const heightScale = clamp(height / DESIGN_HEIGHT, 0.55, 1.08);
const fontScale = clamp(width / DESIGN_WIDTH, 0.56, 1);

export function rs(size: number) {
  return round(size * widthScale);
}

export function rvs(size: number) {
  return round(size * heightScale);
}

export function rf(size: number) {
  return round(size * fontScale);
}
