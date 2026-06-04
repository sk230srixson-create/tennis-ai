import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  StyleSheet,
} from 'react-native';
import { confirmDestructive } from '../utils/confirm';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import { PLAYER_LEVELS, PlayerLevel } from '../constants/types';

export default function SettingsModal() {
  const { settings, settingsOpen, updateSettings, closeSettings, resetAll, showToast } = useStore();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [name, setName] = useState(settings.name);
  const [level, setLevel] = useState<PlayerLevel>(settings.level);

  useEffect(() => {
    if (settingsOpen) {
      setApiKey(settings.apiKey);
      setName(settings.name);
      setLevel(settings.level);
    }
  }, [settingsOpen, settings]);

  const handleSave = () => {
    updateSettings({ apiKey, name, level });
    showToast('設定を保存しました');
    closeSettings();
  };

  const handleReset = () => {
    confirmDestructive('全データ削除', '試合記録・スタッツ・メモ・履歴をすべて削除しますか？', '削除', () => {
      resetAll();
      showToast('全データを削除しました');
      closeSettings();
    });
  };

  return (
    <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeSettings}>
      <View style={styles.root}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>設定</Text>

          <Text style={styles.label}>Claude APIキー</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-ant-..."
            placeholderTextColor={Colors.subtext2}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>プレイヤー名</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="例：田中太郎"
            placeholderTextColor={Colors.subtext2}
          />

          <Text style={styles.label}>プレイレベル</Text>
          <View style={styles.segmented}>
            {PLAYER_LEVELS.map((l) => (
              <Pressable
                key={l}
                style={[styles.segBtn, level === l && styles.segBtnActive]}
                onPress={() => setLevel(l)}
              >
                <Text style={[styles.segBtnText, level === l && styles.segBtnTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>保存</Text>
          </Pressable>

          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>全データ削除</Text>
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={closeSettings}>
            <Text style={styles.cancelBtnText}>キャンセル</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    padding: 24,
    gap: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  label: {
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  segBtnActive: {
    backgroundColor: Colors.cyan,
    borderColor: Colors.cyan,
  },
  segBtnText: {
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: '600',
  },
  segBtnTextActive: {
    color: '#000',
  },
  saveBtn: {
    backgroundColor: Colors.cyan,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: 'rgba(255,60,60,0.15)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.3)',
  },
  resetBtnText: {
    color: '#FF5050',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 12,
  },
  cancelBtnText: {
    color: Colors.subtext,
    fontSize: 15,
  },
});
