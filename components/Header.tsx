import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const openSettings = useStore((s) => s.openSettings);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.appName}>TENNIS AI</Text>
        <Text style={styles.tabName}>{title}</Text>
      </View>
      <Pressable onPress={openSettings} style={styles.gearBtn} hitSlop={8}>
        <Ionicons name="settings-outline" size={22} color={Colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  appName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tabName: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  gearBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
