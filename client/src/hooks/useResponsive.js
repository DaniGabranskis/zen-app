import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function useResponsive() {
  const rem = width / 375;
  return {
    width,
    height,
    rem,
    pad: Math.round(width * 0.045),
    corner: Math.round(width * 0.10),
    font: (size) => Math.round(size * rem),
  };
}
