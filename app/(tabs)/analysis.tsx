import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { useStore } from '../../store/useStore';
import { Colors, gradientColors, shared } from '../../constants/theme';
import { TennisStats, Surface, SURFACES } from '../../constants/types';

// ── Stats Grid ───────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: TennisStats[] }) {
  if (!stats.length) return null;
  const avg = (fn: (s: TennisStats) => number) =>
    stats.reduce((a, s) => a + fn(s), 0) / stats.length;

  const items: { label: string; value: string; icon: any; color: string }[] = [
    {
      label: '1stサーブ%',
      value: `${Math.round(avg((s) => (s.s1in / Math.max(s.s1tot, 1)) * 100))}%`,
      icon: 'tennisball-outline',
      color: Colors.cyan,
    },
    {
      label: 'エース',
      value: avg((s) => s.ace).toFixed(1),
      icon: 'flash-outline',
      color: Colors.lime,
    },
    {
      label: 'DF',
      value: avg((s) => s.df).toFixed(1),
      icon: 'close-circle-outline',
      color: '#FF6B6B',
    },
    {
      label: 'ウィナー',
      value: avg((s) => s.win).toFixed(1),
      icon: 'star-outline',
      color: Colors.lime,
    },
    {
      label: 'UFE',
      value: avg((s) => s.ufe).toFixed(1),
      icon: 'warning-outline',
      color: '#FF6B6B',
    },
    {
      label: 'BP防御率',
      value: `${Math.round(avg((s) => (s.bpsv / Math.max(s.bpfc, 1)) * 100))}%`,
      icon: 'shield-checkmark-outline',
      color: Colors.cyan,
    },
    {
      label: 'ブレーク率',
      value: `${Math.round(avg((s) => (s.br / Math.max(s.bp, 1)) * 100))}%`,
      icon: 'trending-up-outline',
      color: Colors.lime,
    },
    {
      label: '1st得点率',
      value: `${Math.round(avg((s) => s.s1pt) * 100)}%`,
      icon: 'checkmark-circle-outline',
      color: Colors.cyan,
    },
  ];

  return (
    <View style={shared.card}>
      <Text style={[shared.sectionTitle, { marginBottom: 14 }]}>平均スタッツ</Text>
      <View style={styles.statsGrid}>
        {items.map(({ label, value, icon, color }) => (
          <View key={label} style={styles.statCell}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Win Rate Chart ───────────────────────────────────────────────

function WinRateChart({ rates }: { rates: number[] }) {
  if (!rates.length) return null;
  const max = Math.max(...rates, 0.01);
  return (
    <View style={shared.card}>
      <Text style={shared.sectionTitle}>勝率推移</Text>
      <View style={styles.chartRow}>
        {rates.map((v, i) => (
          <View key={i} style={styles.barCol}>
            <Text style={styles.barValue}>{Math.round(v * 100)}%</Text>
            <LinearGradient
              colors={[Colors.cyan, Colors.lime]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.bar, { height: Math.max(8, (v / max) * 100) }]}
            />
            <Text style={styles.barIndex}>{i + 1}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.chartHint}>試合番号（古い順）</Text>
    </View>
  );
}

// ── Winner / UFE Chart ───────────────────────────────────────────

function WinnerUfeChart({ stats }: { stats: TennisStats[] }) {
  if (stats.length < 2) return null;
  const recent = stats.slice(0, 6);
  const maxVal = Math.max(...recent.flatMap((s) => [s.win, s.ufe]), 1);

  return (
    <View style={shared.card}>
      <Text style={shared.sectionTitle}>ウィナー / UFE</Text>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.lime }]} />
          <Text style={styles.legendText}>ウィナー</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.legendText}>UFE</Text>
        </View>
      </View>

      {recent.map((s, i) => (
        <View key={s.id} style={styles.dualBarRow}>
          <Text style={styles.dualBarLabel} numberOfLines={1}>
            {s.opp || `試合${i + 1}`}
          </Text>
          <View style={styles.dualBarGroup}>
            <View style={styles.dualBarTrack}>
              <LinearGradient
                colors={[Colors.cyan, Colors.lime]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.dualBarFill, { width: `${(s.win / maxVal) * 100}%` }]}
              />
            </View>
            <Text style={[styles.dualBarNum, { color: Colors.lime }]}>{s.win}</Text>
          </View>
          <View style={styles.dualBarGroup}>
            <View style={styles.dualBarTrack}>
              <View
                style={[
                  styles.dualBarFill,
                  { width: `${(s.ufe / maxVal) * 100}%`, backgroundColor: '#FF6B6B' },
                ]}
              />
            </View>
            <Text style={[styles.dualBarNum, { color: '#FF6B6B' }]}>{s.ufe}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Surface Bars ─────────────────────────────────────────────────

function SurfaceBars() {
  const matches = useStore((s) => s.matches);
  const rows = SURFACES.map((surf) => {
    const group = matches.filter((m) => m.surf === surf);
    if (!group.length) return null;
    const wins = group.filter((m) => m.r === '勝ち').length;
    const rate = wins / group.length;
    return { surf, rate, wins, count: group.length };
  }).filter(Boolean) as { surf: Surface; rate: number; wins: number; count: number }[];

  if (!rows.length) return null;
  return (
    <View style={shared.card}>
      <Text style={[shared.sectionTitle, { marginBottom: 14 }]}>サーフェス別勝率</Text>
      {rows.map(({ surf, rate, wins, count }) => (
        <View key={surf} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={styles.metricLabel}>{surf}</Text>
            <Text style={styles.metricSub}>
              {wins}勝 / {count}試合
            </Text>
            <Text style={styles.metricPct}>{Math.round(rate * 100)}%</Text>
          </View>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={[Colors.cyan, Colors.lime]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${Math.round(rate * 100)}%` }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Insight Panel ────────────────────────────────────────────────

function InsightPanel({ stats }: { stats: TennisStats[] }) {
  if (!stats.length) return null;

  const avg = (fn: (s: TennisStats) => number) =>
    stats.reduce((a, s) => a + fn(s), 0) / stats.length;

  const avgServe = avg((s) => s.s1in / Math.max(s.s1tot, 1));
  const avgWin = avg((s) => s.win);
  const avgUfe = avg((s) => s.ufe);
  const avgDef = avg((s) => s.bpsv / Math.max(s.bpfc, 1));
  const avgBreak = avg((s) => s.br / Math.max(s.bp, 1));

  const insights: { text: string; detail: string; isStrength: boolean }[] = [
    {
      text: avgServe >= 0.6 ? '1stサーブ確率が高い' : '1stサーブ確率を上げる',
      detail: `現在 ${Math.round(avgServe * 100)}%（目標 60%以上）`,
      isStrength: avgServe >= 0.6,
    },
    {
      text: avgWin >= 15 ? '攻撃力が高い' : '決定打を増やす',
      detail: `平均 ${avgWin.toFixed(1)} ウィナー`,
      isStrength: avgWin >= 15,
    },
    {
      text: avgUfe > 20 ? 'ミスを減らす' : 'ミス管理が安定',
      detail: `平均 ${avgUfe.toFixed(1)} UFE（目標 20以下）`,
      isStrength: avgUfe <= 20,
    },
    {
      text: avgDef >= 0.6 ? 'BP防御が得意' : 'BP防御が課題',
      detail: `防御率 ${Math.round(avgDef * 100)}%（目標 60%以上）`,
      isStrength: avgDef >= 0.6,
    },
    {
      text: avgBreak >= 0.4 ? 'ブレーク成功率が高い' : 'ブレーク機会を活かす',
      detail: `成功率 ${Math.round(avgBreak * 100)}%（目標 40%以上）`,
      isStrength: avgBreak >= 0.4,
    },
  ];

  const strengths = insights.filter((i) => i.isStrength);
  const improvements = insights.filter((i) => !i.isStrength);

  return (
    <View style={shared.card}>
      <Text style={[shared.sectionTitle, { marginBottom: 14 }]}>インサイト</Text>

      {strengths.length > 0 && (
        <>
          <View style={styles.insightHeader}>
            <Ionicons name="trophy-outline" size={14} color={Colors.lime} />
            <Text style={[styles.insightHeaderText, { color: Colors.lime }]}>強み</Text>
          </View>
          {strengths.map((item, i) => (
            <View key={i} style={[styles.insightRow, styles.insightStrength]}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.lime} />
              <View style={{ flex: 1 }}>
                <Text style={styles.insightText}>{item.text}</Text>
                <Text style={styles.insightDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {improvements.length > 0 && (
        <>
          <View style={[styles.insightHeader, { marginTop: strengths.length ? 12 : 0 }]}>
            <Ionicons name="fitness-outline" size={14} color={Colors.cyan} />
            <Text style={[styles.insightHeaderText, { color: Colors.cyan }]}>改善ポイント</Text>
          </View>
          {improvements.map((item, i) => (
            <View key={i} style={[styles.insightRow, styles.insightImprove]}>
              <Ionicons name="arrow-up-circle" size={18} color={Colors.cyan} />
              <View style={{ flex: 1 }}>
                <Text style={styles.insightText}>{item.text}</Text>
                <Text style={styles.insightDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { matches, stats, sendCoach } = useStore();

  const wins = matches.filter((m) => m.r === '勝ち').length;
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;

  const recentTrend = (() => {
    const recent = matches.slice(0, 5);
    if (!recent.length) return '—';
    const rate = recent.filter((m) => m.r === '勝ち').length / recent.length;
    return rate >= 0.7 ? '上昇↑' : rate >= 0.45 ? '安定→' : '要改善↓';
  })();

  const cumulativeRates = (() => {
    let w = 0;
    return [...matches].reverse().map((m, i) => {
      if (m.r === '勝ち') w++;
      return w / (i + 1);
    });
  })();

  const handleAskAI = () => {
    sendCoach('試合データを分析してアドバイスをください');
    router.push('/');
  };

  return (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top }}>
        <Header title="分析" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([
            ['総合勝率', `${winRate}%`, Colors.lime],
            ['直近トレンド', recentTrend, Colors.cyan],
            ['試合数', String(matches.length), Colors.text],
          ] as [string, string, string][]).map(([label, val, color]) => (
            <View key={label} style={[shared.card, { flex: 1, alignItems: 'center', padding: 14 }]}>
              <Text style={{ color, fontSize: 18, fontWeight: '700' }}>{val}</Text>
              <Text style={{ color: Colors.subtext, fontSize: 10, fontWeight: '700', marginTop: 3 }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {stats.length >= 1 && <StatsGrid stats={stats} />}

        {matches.length >= 3 && (
          <>
            <WinRateChart rates={cumulativeRates} />
            <SurfaceBars />
          </>
        )}

        {stats.length >= 2 && <WinnerUfeChart stats={stats} />}

        <InsightPanel stats={stats} />

        <Pressable style={styles.askBtn} onPress={handleAskAI}>
          <Ionicons name="chatbubbles-outline" size={20} color="#000" />
          <Text style={styles.askBtnText}>AI に詳細分析を依頼する</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCell: {
    width: '22%',
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { color: Colors.subtext, fontSize: 9, fontWeight: '700', textAlign: 'center' },

  // Win rate chart
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 4, marginTop: 12 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { color: Colors.text, fontSize: 9, fontWeight: '700', marginBottom: 2 },
  bar: { width: '100%', borderRadius: 4 },
  barIndex: { color: Colors.subtext, fontSize: 9, marginTop: 3 },
  chartHint: { color: Colors.subtext2, fontSize: 10, textAlign: 'center', marginTop: 6 },

  // Dual bar (winner/ufe)
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.subtext, fontSize: 12, fontWeight: '600' },
  dualBarRow: { marginBottom: 10 },
  dualBarLabel: { color: Colors.text, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  dualBarGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dualBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dualBarFill: { height: '100%', borderRadius: 4 },
  dualBarNum: { fontSize: 11, fontWeight: '700', width: 24, textAlign: 'right' },

  // Surface bars
  metricLabel: { color: Colors.text, fontSize: 13, fontWeight: '700', flex: 1 },
  metricSub: { color: Colors.subtext, fontSize: 11 },
  metricPct: { color: Colors.cyan, fontSize: 13, fontWeight: '700', marginLeft: 8 },
  barTrack: {
    height: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5 },

  // Insight
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  insightHeaderText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, borderRadius: 10, padding: 10 },
  insightStrength: { backgroundColor: 'rgba(198,255,46,0.07)' },
  insightImprove: { backgroundColor: 'rgba(26,235,255,0.07)' },
  insightText: { color: Colors.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  insightDetail: { color: Colors.subtext, fontSize: 11 },

  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cyan,
    borderRadius: 18,
    padding: 16,
  },
  askBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
