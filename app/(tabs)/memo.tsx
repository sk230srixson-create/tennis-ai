import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  StyleSheet, Modal,
} from 'react-native';
import { confirmDestructive } from '../../utils/confirm';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { useStore } from '../../store/useStore';
import { Colors, gradientColors, shared } from '../../constants/theme';
import { TennisMemo } from '../../constants/types';

function MemoFormModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState('');

  const handleSave = () => {
    if (!text.trim()) return;
    onSave(text.trim());
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={[shared.row, { marginBottom: 8 }]}>
          <Text style={styles.modalTitle}>メモ追加</Text>
          <Pressable onPress={onClose} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close" size={24} color={Colors.subtext} />
          </Pressable>
        </View>
        <TextInput
          style={styles.textArea}
          value={text}
          onChangeText={setText}
          placeholder="気づき・練習テーマ・戦術メモ"
          placeholderTextColor={Colors.subtext2}
          multiline
          autoFocus
        />
        <Pressable
          style={[styles.saveBtn, !text.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!text.trim()}
        >
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function MemoCard({ memo, onDelete }: { memo: TennisMemo; onDelete: () => void }) {
  return (
    <View style={shared.card}>
      <Text style={styles.memoText}>{memo.text}</Text>
      <View style={[shared.row, { marginTop: 10 }]}>
        <Text style={styles.memoDate}>{memo.date}</Text>
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

export default function MemoScreen() {
  const insets = useSafeAreaInsets();
  const { memos, addMemo, deleteMemo, showToast } = useStore();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = (id: number, text: string) => {
    confirmDestructive('メモを削除しますか？', text.slice(0, 30) + (text.length > 30 ? '…' : ''), '削除', () => {
      deleteMemo(id);
      showToast('メモを削除しました');
    });
  };

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top }}>
        <Header title="メモ" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {memos.length === 0 ? (
          <View style={[shared.card, { alignItems: 'center', padding: 40 }]}>
            <Ionicons name="document-text-outline" size={40} color={Colors.subtext} />
            <Text style={{ color: Colors.subtext, marginTop: 12, fontSize: 15 }}>メモがまだありません</Text>
          </View>
        ) : (
          memos.map((m) => (
            <MemoCard key={m.id} memo={m} onDelete={() => handleDelete(m.id, m.text)} />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={() => setModalOpen(true)}>
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>

      <MemoFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(text) => { addMemo(text); showToast('メモを追加しました'); }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },

  memoText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  memoDate: { color: Colors.subtext, fontSize: 12, flex: 1 },
  deleteBtn: { padding: 4 },

  fab: {
    position: 'absolute', right: 22, width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.lime, shadowOpacity: 0.45, shadowRadius: 18, elevation: 8,
  },

  modalRoot: { flex: 1, backgroundColor: '#0A1628', padding: 24, gap: 16 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  textArea: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveBtn: {
    backgroundColor: Colors.cyan,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
