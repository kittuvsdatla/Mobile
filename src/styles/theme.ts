/**
 * BusinessApp Mobile — Central Design Theme
 * Inspired by Zepto / Premium dark-vibrant aesthetic
 */

export const COLORS = {
  // Primary palette (Zepto Emerald)
  primary:       '#10b981',   // Vibrant emerald
  primaryDark:   '#059669',
  primaryLight:  '#ecfdf5',
  accent:        '#0f172a',   // Deep navy accent instead of orange
  accentLight:   '#f1f5f9',

  // Dark Mode / Hero
  dark:          '#0f172a',
  darkCard:      '#1e293b',
  darkBorder:    '#334155',

  // Backgrounds
  background:    '#f8fafc',
  surface:       '#ffffff',
  surfaceAlt:    '#f1f5f9',

  // Text
  textPrimary:   '#0f172a',
  textSecondary: '#475569',
  textMuted:     '#64748b',
  textLight:     '#94a3b8',
  textWhite:     '#ffffff',

  // Status
  success:       '#10b981',
  successLight:  '#ecfdf5',
  warning:       '#f59e0b',
  warningLight:  '#fffbeb',
  danger:        '#f43f5e',
  dangerLight:   '#fff1f2',
  info:          '#3b82f6',
  infoLight:     '#eff6ff',

  // Borders
  border:        '#e2e8f0',
  borderLight:   '#f1f5f9',

  // Gradients
  gradientGreen: ['#10b981', '#059669'] as [string, string],
  gradientDark:  ['#0f172a', '#1e293b'] as [string, string],
  gradientBlue:  ['#3b82f6', '#2563eb'] as [string, string],
  gradientPurple:['#8b5cf6', '#7c3aed'] as [string, string],
  gradientRose:  ['#f43f5e', '#e11d48'] as [string, string],
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

export const SHADOWS = {
  sm: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  md: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  lg: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  green: {
    elevation: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  dark: {
    elevation: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
};

export const FONT = {
  xs:   11,
  sm:   12,
  md:   14,
  base: 15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 28,
  hero: 36,
};

export default { COLORS, SPACING, RADIUS, SHADOWS, FONT };
