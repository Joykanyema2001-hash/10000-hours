import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

type P = { size?: number; color?: string; weight?: number };

export const ClockIcon = ({ size = 24, color = colors.ink, weight = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} />
    <Path d="M12 6v6l4 3" />
  </Svg>
);

export const FlagIcon = ({ size = 24, color = colors.ink, weight = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 21V4" />
    <Path d="M6 4h12l-3 4 3 4H6" />
  </Svg>
);

export const BackIcon = ({ size = 24, color = colors.ink }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const CloseIcon = ({ size = 24, color = colors.ink }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
    <Path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const PlayIcon = ({ size = 20, color = colors.lime }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M7 4.5v15l12-7.5z" />
  </Svg>
);

export const PauseIcon = ({ size = 20, color = colors.ink }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z" />
  </Svg>
);

export const PlusIcon = ({ size = 20, color = colors.ink }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CheckCircle = ({ size = 24 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={colors.ink}>
    <Circle cx={12} cy={12} r={11} />
    <Path d="M7 12.5l3.5 3.5L17 9" fill="none" stroke={colors.lime} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const OpenCircle = ({ size = 24 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2}>
    <Circle cx={12} cy={12} r={10} />
  </Svg>
);
