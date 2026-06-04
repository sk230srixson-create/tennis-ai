import { StyleSheet } from 'react-native';

export const Colors = {
  background: '#030810',
  surface: 'rgba(255,255,255,0.075)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  cyan: '#1AEBFF',
  lime: '#C6FF2E',
  text: '#FFFFFF',
  subtext: 'rgba(255,255,255,0.55)',
  subtext2: 'rgba(255,255,255,0.35)',
  danger: 'rgba(255,60,60,0.8)',
  win: '#C6FF2E',
  loss: 'rgba(255,80,80,0.9)',
};

export const gradientColors = ['#030D1B', '#050F18', '#000000'] as const;

export const shared = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
