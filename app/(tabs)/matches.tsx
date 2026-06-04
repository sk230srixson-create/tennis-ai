import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  StyleSheet, Modal, Alert,
} from 'react-native';
import { confirmDestructive } from '../../utils/confirm';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { useStore } from '../../store/useStore';
import { Colors, gradientColors, shared } from '../../constants/theme';
import {
  TennisMatch, MatchFormat, MatchResult, Surface, Condition,
  MATCH_FORMATS, MATCH_RESULTS, SURFACES, CONDITIONS,
} from '../../constants/types';

// ── Pickers ──────────────────────────────────────────────────────

function SegPicker<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Pressable
          key={o}
          style={[styles.segBtn, value === o && styles.segBtnActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.segBtnText, value === o && styles.segBtnTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Match Form Modal ──────────────────────────────────────────────

function MatchFormModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (m: TennisMatch) => void }) {
  const [opponent, setOpponent] = useState('');
  const [score, setScore] = useState('');
  const [result, setResult] = useState<MatchResult>('勝ち');
  const [fmt, setFmt] = useState<MatchFormat>('シングルス');
  const [surf, setSurf] = useState<Surface>('ハード');
  const [cond, setCond] = useState<Condition>('普通');
  const [memo, setMemo] = useState('');

  const reset = () => { setOpponent(''); setScore(''); setResult('勝ち'); setFmt('シングルス'); setSurf('ハード'); setCond('普通'); setMemo(''); };

  const handleSave = () => {
    if (!opponent.trim()) return Alert.alert('', '対戦相手を入力してください');
    onSave({ id: Date.now(), d: new Date().toISOString().slice(0, 10), o: opponent.trim(), fmt, s: score.trim(), r: result, surf, cond, memo: memo.trim() });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={shared.row}>
          <Text style={styles.modalTitle}>試合記録を追加</Text>
          <Pressable onPress={onClose} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close" size={24} color={Colors.subtext} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
          <FormField label="対戦相手">
            <TextInput style={styles.input} value={opponent} onChangeText={setOpponent} placeholder="例：田中選手" placeholderTextColor={Colors.subtext2} />
          </FormField>
          <FormField label="スコア">
            <TextInput style={styles.input} value={score} onChangeText={setScore} placeholder="例：6-4, 7-5" placeholderTextColor={Colors.subtext2} />
          </FormField>
          <FormField label="勝敗"><SegPicker options={MATCH_RESULTS} value={result} onChange={setResult} /></FormField>
          <FormField label="形式"><SegPicker options={MATCH_FORMATS} value={fmt} onChange={setFmt} /></FormField>
          <FormField label="サーフェス"><SegPicker options={SURFACES} value={surf} onChange={setSurf} /></FormField>
          <FormField label="コンディション"><SegPicker options={CONDITIONS} value={cond} onChange={setCond} /></FormField>
          <FormField label="メモ">
            <TextInput style={[styles.input, { minHeight: 72 }]} value={memo} onChangeText={setMemo} placeholder="気づき・戦術メモ" placeholderTextColor={Colors.subtext2} multiline />
          </FormField>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>保存</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── Match Card ───────────────────────────────────────────────────

function MatchCard({ match, onDelete }: { match: TennisMatch; onDelete: () => void }) {
  const isWin = match.r === '勝ち';
  return (
    <View style={shared.card}>
      <View style={[shared.row, { marginBottom: 8 }]}>
        <Text style={styles.cardOpponent}>{match.o}</Text>
        <View style={[styles.resultBadge, { backgroundColor: isWin ? Colors.lime : 'rgba(255,80,80,0.65)' }]}>
          <Text style={[styles.resultBadgeText, { color: isWin ? '#000' : '#fff' }]}>{match.r}</Text>
        </View>
      </View>
      <Text style={styles.cardScore}>{match.s || 'スコア未入力'}</Text>
      <Text style={styles.cardMeta}>{match.d} ・ {match.surf} ・ {match.fmt} ・ コンディション {match.cond}</Text>
      {match.memo ? <Text style={styles.cardMemo}>{match.memo}</Text> : null}
      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={14} color={Colors.danger} />
        <Text style={styles.deleteBtnText}>削除</Text>
      </Pressable>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { matches, addMatch, deleteMatch, showToast } = useStore();
  const [modalOpen, setModalOpen] = useState(false);

  const wins = matches.filter((m) => m.r === '勝ち').length;
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;

  const handleDelete = (id: number, o: string) => {
    confirmDestructive(`${o} の記録を削除しますか？`, '', '削除', () => {
      deleteMatch(id);
      showToast('削除しました');
    });
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <Header title="試合記録" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary */}
        <View style={[shared.row, { gap: 10 }]}>
          {[['総試合', String(matches.length)], ['勝率', `${winRate}%`], ['勝ち', String(wins)], ['負け', String(matches.length - wins)]].map(([label, val]) => (
            <View key={label} style={[shared.card, styles.summaryCard]}>
              <Text style={styles.summaryVal}>{val}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {matches.map((m) => (
          <MatchCard key={m.id} match={m} onDelete={() => handleDelete(m.id, m.o)} />
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={() => setModalOpen(true)}>
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>

      <MatchFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(m) => { addMatch(m); showToast('試合を追加しました'); }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },

  summaryCard: { flex: 1, alignItems: 'center', padding: 14 },
  summaryVal: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: Colors.subtext, fontSize: 11, fontWeight: '700', marginTop: 3 },

  cardOpponent: { color: Colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  resultBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  resultBadgeText: { fontSize: 12, fontWeight: '700' },
  cardScore: { color: Colors.cyan, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  cardMeta: { color: Colors.subtext, fontSize: 12, marginBottom: 6 },
  cardMemo: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  deleteBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '700' },

  fab: {
    position: 'absolute',
    right: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.lime,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },

  modalRoot: { flex: 1, backgroundColor: '#0A1628', padding: 24, gap: 16 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 13,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fieldLabel: { color: Colors.subtext, fontSize: 13, fontWeight: '600' },
  segBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  segBtnActive: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  segBtnText: { color: Colors.subtext, fontSize: 13, fontWeight: '600' },
  segBtnTextActive: { color: '#000' },
  saveBtn: { backgroundColor: Colors.cyan, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
