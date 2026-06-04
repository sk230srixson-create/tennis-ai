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
import { TennisStats, Surface, SURFACES } from '../../constants/types';

// ── Shared ───────────────────────────────────────────────────────

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <View style={{ gap: 6 }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricPct}>{pct}%</Text>
      </View>
      <View style={styles.barTrack}>
        <LinearGradient
          colors={[Colors.cyan, Colors.lime]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFill, { width: `${pct}%` }]}
        />
      </View>
    </View>
  );
}

function MiniStat({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatVal}>{value}{suffix}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ── Panels ───────────────────────────────────────────────────────

function ServePanel({ s }: { s: TennisStats }) {
  const firstServeRate = s.s1in / Math.max(s.s1tot, 1);
  const breakRate = s.br / Math.max(s.bp, 1);
  return (
    <View style={shared.card}>
      <Text style={shared.sectionTitle}>サーブ</Text>
      <View style={{ gap: 12, marginTop: 12 }}>
        <MetricBar label="1st サーブ確率" value={firstServeRate} />
        <MetricBar label="ブレーク成功率" value={breakRate} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat label="エース" value={s.ace} />
          <MiniStat label="DF" value={s.df} />
          <MiniStat label="1st IN" value={s.s1in} suffix={`/${s.s1tot}`} />
        </View>
      </View>
    </View>
  );
}

function ShotPanel({ s }: { s: TennisStats }) {
  return (
    <View style={shared.card}>
      <Text style={shared.sectionTitle}>ラリー・ショット</Text>
      <View style={{ gap: 12, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat label="ウィナー" value={s.win} />
          <MiniStat label="UFE" value={s.ufe} />
          <MiniStat label="FE" value={s.fe} />
        </View>
        <MetricBar label="1〜3球 勝率" value={s.rl1w / Math.max(s.rl1t, 1)} />
        <MetricBar label="4〜8球 勝率" value={s.rl4w / Math.max(s.rl4t, 1)} />
        <MetricBar label="9球以上 勝率" value={s.rl9w / Math.max(s.rl9t, 1)} />
      </View>
    </View>
  );
}

function BreakPanel({ s }: { s: TennisStats }) {
  return (
    <View style={shared.card}>
      <Text style={shared.sectionTitle}>ブレーク</Text>
      <View style={{ gap: 12, marginTop: 12 }}>
        <MetricBar label="BP 防御率" value={s.bpsv / Math.max(s.bpfc, 1)} />
        <MetricBar label="BP 獲得率" value={s.bpw / Math.max(s.bpt, 1)} />
      </View>
    </View>
  );
}

// ── Stats Form ───────────────────────────────────────────────────

function SegPicker<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Pressable key={o} style={[styles.segBtn, value === o && styles.segBtnActive]} onPress={() => onChange(o)}>
          <Text style={[styles.segBtnText, value === o && styles.segBtnTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function NumStepper({ label, value, onChange, min = 0, max = 200 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <View style={[shared.row, { justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12 }]}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={[shared.row, { gap: 16 }]}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={8}>
          <Ionicons name="remove-circle-outline" size={24} color={Colors.cyan} />
        </Pressable>
        <Text style={styles.stepperVal}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.cyan} />
        </Pressable>
      </View>
    </View>
  );
}

function StatsFormModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (s: TennisStats) => void }) {
  const [opp, setOpp] = useState('');
  const [surf, setSurf] = useState<Surface>('ハード');
  const [s1in, setS1in] = useState(0);
  const [s1tot, setS1tot] = useState(1);
  const [ace, setAce] = useState(0);
  const [df, setDf] = useState(0);
  const [win, setWin] = useState(0);
  const [ufe, setUfe] = useState(0);

  const reset = () => { setOpp(''); setSurf('ハード'); setS1in(0); setS1tot(1); setAce(0); setDf(0); setWin(0); setUfe(0); };

  const handleSave = () => {
    onSave({
      id: Date.now(), d: new Date().toISOString().slice(0, 10),
      opp: opp || '未入力', fmt: 'シングルス', surf,
      s1in, s1tot: Math.max(s1tot, 1), s2in: 0, s2tot: 1,
      ace, df, s1pt: 0, s2pt: 0, br: 0, bp: 1, race: 0,
      win, ufe, fe: 0, tpt: 0,
      rl1w: 0, rl1t: 1, rl4w: 0, rl4t: 1, rl9w: 0, rl9t: 1,
      bpw: 0, bpt: 1, bpsv: 0, bpfc: 1,
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={shared.row}>
          <Text style={styles.modalTitle}>スタッツ入力</Text>
          <Pressable onPress={onClose} style={{ marginLeft: 'auto' }}><Ionicons name="close" size={24} color={Colors.subtext} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
          <Text style={styles.fieldLabel}>対戦相手</Text>
          <TextInput style={styles.input} value={opp} onChangeText={setOpp} placeholder="例：田中選手" placeholderTextColor={Colors.subtext2} />
          <Text style={styles.fieldLabel}>サーフェス</Text>
          <SegPicker options={SURFACES} value={surf} onChange={setSurf} />
          <NumStepper label={`1st IN: ${s1in}`} value={s1in} onChange={setS1in} />
          <NumStepper label={`1st 試投: ${s1tot}`} value={s1tot} onChange={setS1tot} min={1} />
          <NumStepper label={`エース: ${ace}`} value={ace} onChange={setAce} />
          <NumStepper label={`DF: ${df}`} value={df} onChange={setDf} />
          <NumStepper label={`ウィナー: ${win}`} value={win} onChange={setWin} />
          <NumStepper label={`UFE: ${ufe}`} value={ufe} onChange={setUfe} />
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>保存</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { stats, addStats, deleteStats, showToast } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const latest = stats[0];

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top }}>
        <Header title="スタッツ" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {latest ? (
          <>
            <ServePanel s={latest} />
            <ShotPanel s={latest} />
            <BreakPanel s={latest} />
          </>
        ) : (
          <View style={[shared.card, { alignItems: 'center', padding: 32 }]}>
            <Text style={{ color: Colors.subtext, fontSize: 15 }}>スタッツがまだありません</Text>
          </View>
        )}
        {stats.slice(0, 5).map((s) => (
          <View key={s.id} style={[shared.card, shared.row]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>{s.opp}</Text>
              <Text style={{ color: Colors.subtext, fontSize: 12, marginTop: 3 }}>{s.d} ・ {s.surf}</Text>
            </View>
            <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: '700', marginRight: 12 }}>
              1st {Math.round((s.s1in / Math.max(s.s1tot, 1)) * 100)}%
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', marginRight: 12 }}>
              W {s.win} / UFE {s.ufe}
            </Text>
            <Pressable onPress={() => {
              confirmDestructive('削除', `${s.opp}のスタッツを削除しますか？`, '削除', () => {
                deleteStats(s.id);
                showToast('削除しました');
              });
            }} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            </Pressable>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={() => setModalOpen(true)}>
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>

      <StatsFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(s) => { addStats(s); showToast('スタッツを保存しました'); }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },

  metricLabel: { color: Colors.subtext, fontSize: 12, fontWeight: '700', flex: 1 },
  metricPct: { color: Colors.cyan, fontSize: 12, fontWeight: '700' },
  barTrack: { height: 9, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },

  miniStat: {
    flex: 1, alignItems: 'center', padding: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
  },
  miniStatVal: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  miniStatLabel: { color: Colors.subtext, fontSize: 11, marginTop: 2 },

  stepperLabel: { color: Colors.text, fontSize: 14, flex: 1 },
  stepperVal: { color: Colors.text, fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },

  fab: {
    position: 'absolute', right: 22, width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.lime, shadowOpacity: 0.45, shadowRadius: 18, elevation: 8,
  },

  modalRoot: { flex: 1, backgroundColor: '#0A1628', padding: 24, gap: 12 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 13, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  fieldLabel: { color: Colors.subtext, fontSize: 13, fontWeight: '600' },
  segBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  segBtnActive: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  segBtnText: { color: Colors.subtext, fontSize: 13, fontWeight: '600' },
  segBtnTextActive: { color: '#000' },
  saveBtn: { backgroundColor: Colors.cyan, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
