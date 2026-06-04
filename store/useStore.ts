import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TennisMatch, TennisStats, TennisMemo, TennisSettings, CoachMessage,
} from '../constants/types';
import { claudeComplete, buildImageContent, CHAT_MODEL, VISION_MODEL } from '../services/claude';
import { extractVideoFrames } from '../services/videoAnalyzer';

const nowId = () => Date.now();
const isoDay = () => new Date().toISOString().slice(0, 10);

const SAMPLE_MATCHES: TennisMatch[] = [
  { id: 1, d: '2026-05-18', o: '田中選手', fmt: 'シングルス', s: '6-4, 7-5', r: '勝ち', surf: 'ハード', cond: '普通', memo: 'フォアの逆クロスが有効' },
  { id: 2, d: '2026-05-12', o: '佐藤選手', fmt: 'シングルス', s: '4-6, 6-3, 4-6', r: '負け', surf: 'クレー', cond: '普通', memo: '長いラリーで先にミス' },
  { id: 3, d: '2026-05-04', o: '鈴木選手', fmt: 'シングルス', s: '6-2, 6-3', r: '勝ち', surf: 'ハード', cond: '普通', memo: '' },
];

const SAMPLE_STATS: TennisStats[] = [
  { id: 1, d: '2026-05-18', opp: '田中選手', fmt: 'シングルス', surf: 'ハード', s1in: 42, s1tot: 66, s2in: 20, s2tot: 24, ace: 6, df: 3, s1pt: 31, s2pt: 12, br: 4, bp: 9, race: 0, win: 21, ufe: 17, fe: 8, tpt: 78, rl1w: 22, rl1t: 38, rl4w: 18, rl4t: 31, rl9w: 7, rl9t: 15, bpw: 5, bpt: 8, bpsv: 6, bpfc: 9 },
  { id: 2, d: '2026-05-12', opp: '佐藤選手', fmt: 'シングルス', surf: 'クレー', s1in: 36, s1tot: 72, s2in: 0, s2tot: 1, ace: 2, df: 7, s1pt: 0, s2pt: 0, br: 2, bp: 8, race: 0, win: 14, ufe: 27, fe: 0, tpt: 0, rl1w: 0, rl1t: 1, rl4w: 0, rl4t: 1, rl9w: 0, rl9t: 1, bpw: 0, bpt: 1, bpsv: 3, bpfc: 8 },
];

const SAMPLE_MEMOS: TennisMemo[] = [
  { id: 1, text: 'セカンドサーブは身体を開かず、肩越しに打点を見る。', date: '2026-05-18' },
  { id: 2, text: '次回：相手バック深め→短い球を前で処理。', date: '2026-05-18' },
];

const INITIAL_HISTORY: CoachMessage[] = [
  { id: '0', role: 'assistant', content: 'こんにちは。直近の試合とスタッツを見ながら、今日の勝ち筋を一緒に整理しましょう。' },
];

interface Store {
  matches: TennisMatch[];
  stats: TennisStats[];
  memos: TennisMemo[];
  settings: TennisSettings;
  history: CoachMessage[];
  isTyping: boolean;
  videoProgress: string;
  analyzedVideoUri: string | null;
  videoSeekTarget: number | null;
  pendingInferredStats: TennisStats | null;
  lastAnalysisError: string | null;
  toast: string | null;
  settingsOpen: boolean;

  addMatch: (m: TennisMatch) => void;
  deleteMatch: (id: number) => void;
  addStats: (s: TennisStats) => void;
  deleteStats: (id: number) => void;
  addMemo: (text: string) => void;
  deleteMemo: (id: number) => void;
  updateSettings: (patch: Partial<TennisSettings>) => void;
  resetAll: () => void;
  showToast: (msg: string) => void;
  hideToast: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  sendCoach: (text: string) => Promise<void>;
  analyzeVideo: (uri: string, targetPlayer: string) => Promise<void>;
  seekVideoTo: (seconds: number) => void;
  clearVideoSeek: () => void;
  confirmInferredStats: () => void;
  dismissInferredStats: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      matches: SAMPLE_MATCHES,
      stats: SAMPLE_STATS,
      memos: SAMPLE_MEMOS,
      settings: { name: 'プレイヤー', level: '中級者' },
      history: INITIAL_HISTORY,
      isTyping: false,
      videoProgress: '',
      analyzedVideoUri: null,
      videoSeekTarget: null,
      pendingInferredStats: null,
      lastAnalysisError: null,
      toast: null,
      settingsOpen: false,

      addMatch: (m) => set((s) => ({ matches: [m, ...s.matches] })),
      deleteMatch: (id) => set((s) => ({ matches: s.matches.filter((m) => m.id !== id) })),
      addStats: (item) => set((s) => ({ stats: [item, ...s.stats] })),
      deleteStats: (id) => set((s) => ({ stats: s.stats.filter((x) => x.id !== id) })),
      addMemo: (text) => set((s) => ({ memos: [{ id: nowId(), text, date: isoDay() }, ...s.memos] })),
      deleteMemo: (id) => set((s) => ({ memos: s.memos.filter((m) => m.id !== id) })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetAll: () => set({ matches: [], stats: [], memos: [], history: INITIAL_HISTORY }),
      showToast: (msg) => {
        set({ toast: msg });
        setTimeout(() => set({ toast: null }), 2500);
      },
      hideToast: () => set({ toast: null }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),

      sendCoach: async (text) => {
        const clean = text.trim();
        if (!clean) return;

        const userMsg: CoachMessage = { id: String(nowId()), role: 'user', content: clean };
        set((s) => ({ history: [...s.history.slice(-19), userMsg] }));
        set({ isTyping: true });

        const { settings, matches, stats, memos } = get();
        const system = buildCoachSystem(settings, matches, stats, memos);
        const msgs = get().history.slice(-20).map((m) => ({ role: m.role, content: m.content }));

        try {
          const reply = await claudeComplete(CHAT_MODEL, system, msgs, 1500);
          set((s) => ({
            history: [...s.history, { id: String(nowId()), role: 'assistant', content: reply }],
            isTyping: false,
          }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          set((s) => ({
            history: [...s.history, { id: String(nowId()), role: 'assistant', content: `⚠️ ${msg}` }],
            isTyping: false,
          }));
        }
      },

      analyzeVideo: async (uri, targetPlayer) => {
        set({ lastAnalysisError: null });
        const { settings } = get();
        set({ analyzedVideoUri: uri });

        let segments: import('../services/videoAnalyzer').VideoSegment[] = [];
        try {
          set({ videoProgress: '動画を8セグメントに分割中…' });
          segments = await extractVideoFrames(uri);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          set({ videoProgress: '', lastAnalysisError: msg });
          set((s) => ({ history: [...s.history, { id: String(nowId()), role: 'assistant', content: `⚠️ ${msg}` }] }));
          return;
        }

        const fmtTime = (sec: number) => {
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60);
          return `${m}:${s.toString().padStart(2, '0')}`;
        };

        const partials: string[] = [];
        for (let i = 0; i < segments.length; i++) {
          const { frames, startSec, endSec } = segments[i];
          if (!frames.length) continue;
          const timeLabel = `${fmtTime(startSec)}〜${fmtTime(endSec)}`;
          set({ videoProgress: `${timeLabel}（${i + 1}/${segments.length}）：${frames.length}フレームを詳細解析中` });

          const prompt =
`これはテニス試合動画の ${timeLabel} 区間から抽出した ${frames.length} 枚の連続フレームです（時系列順）。
分析対象選手は「${targetPlayer}」です。ウェアや体格の特徴からコートチェンジ後もその選手を追跡してください。

以下の観点で**具体的かつ詳細に**分析してください。観察できない項目は省略して構いません。

**【ボール追跡】**
- 各フレーム間でのボールの軌道・弾道・スピン（トップスピン/スライス/フラット）を推定
- バウンド位置（深さ・コース：クロス/ストレート/センター/ボディ）
- ショットの種類（サーブ/フォアハンド/バックハンド/スライス/ドロップショット/ボレー/スマッシュ）

**【選手の動き・フォーム】**
- 打球前後のフットワーク・スプリットステップ・体重移動
- 打点の高さ・前後位置（ライジング/頂点/落下）
- スイング軌道・フォロースルーの特徴
- コートポジション（ベースライン後方/ベースライン上/ミッドコート/ネット）

**【戦術・ラリーパターン】**
- このシーンで見られる配球の意図（コーナー攻め/センター返球/アングルショット）
- 相手の状況に応じたポジションの変化
- ラリー中の主導権（攻撃/守備/中立）

観察事実を箇条書きで簡潔に記述してください。前置きや結論は不要です。`;

          const content = buildImageContent(frames, prompt);
          try {
            const analysis = await claudeComplete(VISION_MODEL, null, [{ role: 'user', content }], 1200);
            partials.push(`【${timeLabel}】\n${analysis}`);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            partials.push(`【${timeLabel}】解析失敗: ${msg}`);
          }
        }

        set({ videoProgress: '全区間を統合分析中…' });
        const synthesizePrompt =
`以下はテニス試合動画の各区間詳細分析です（対象選手：「${targetPlayer}」）。
全区間を横断して統合し、以下のMarkdown形式でコーチングレポートを作成してください。
データに基づいた具体的な観察と改善提案を記述し、推測は「〜と思われる」と明示してください。

## サーブ分析
- 1stサーブのコース傾向・球種・スピード感
- 2ndサーブの傾向（スピン系/フラット系）
- サーブ後の展開パターン（サーブ＆ボレー/ベースライン待機）

## ストローク分析
- フォアハンドの球質・コース・打点の傾向
- バックハンドの球質・コース・安定性
- スライス・ドロップショットなど変化球の使用状況

## フットワーク・ポジショニング
- コートカバーリングの特徴
- 前後左右の動き出しのクセ
- ネットアプローチのタイミングと頻度

## 配球パターン・戦術
- 得点を取る際の典型的な配球パターン
- 守備時の返球の傾向
- ラリー中の主導権の取り方

## 得点・失点パターン
- ウィナーを取る典型的なシーン
- ミスが発生しやすい状況・ショット

## 優先改善課題（重要度順トップ3）
1. 最優先課題：具体的な改善内容と練習方法
2. 次優先課題：具体的な改善内容と練習方法
3. 強化課題：具体的な改善内容と練習方法

---
区間別分析:
${partials.join('\n\n')}`;

        let report = '';
        try {
          report = await claudeComplete(VISION_MODEL, null, [{ role: 'user', content: synthesizePrompt }], 3500);
          set((s) => ({ history: [...s.history, { id: String(nowId()), role: 'assistant', content: report }] }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          set({ videoProgress: '', lastAnalysisError: msg });
          set((s) => ({ history: [...s.history, { id: String(nowId()), role: 'assistant', content: `⚠️ 統合分析に失敗しました: ${msg}` }] }));
          return;
        }

        set({ videoProgress: 'スタッツを推定中…' });
        try {
          const inferPrompt =
`次のテニス試合動画分析から推定できるスタッツを返してください。
視覚的に確認できた範囲のみで構いません。不明な項目は 0 にしてください。
必ず以下のJSONオブジェクトのみを返してください（説明文・記号なし、数値のみ）:
{"s1in":数値,"s1tot":数値,"s2in":数値,"s2tot":数値,"ace":数値,"df":数値,"win":数値,"ufe":数値,"br":数値,"bp":数値,"bpsv":数値,"bpfc":数値}

分析:\n${report}`;
          const raw = await claudeComplete(CHAT_MODEL, null, [{ role: 'user', content: inferPrompt }], 150);
          const parsed = parseInferredStats(raw);
          if (parsed) set({ pendingInferredStats: parsed });
        } catch { /* non-fatal */ }

        set({ videoProgress: '' });
      },

      seekVideoTo: (seconds) => set({ videoSeekTarget: seconds }),
      clearVideoSeek: () => set({ videoSeekTarget: null }),

      confirmInferredStats: () => {
        const { pendingInferredStats } = get();
        if (pendingInferredStats) {
          set((s) => ({ stats: [pendingInferredStats, ...s.stats], pendingInferredStats: null }));
        }
      },
      dismissInferredStats: () => set({ pendingInferredStats: null }),
    }),
    {
      name: 'tennis-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        matches: s.matches,
        stats: s.stats,
        memos: s.memos,
        settings: s.settings,
        history: s.history,
      }),
    },
  ),
);

function buildCoachSystem(
  settings: TennisSettings,
  matches: TennisMatch[],
  stats: TennisStats[],
  memos: TennisMemo[],
): string {
  const pct = (n: number, d: number) => d ? `${Math.round((n / d) * 100)}%` : 'N/A';
  const avg = (fn: (s: TennisStats) => number) =>
    stats.length ? (stats.reduce((a, s) => a + fn(s), 0) / stats.length).toFixed(1) : 'N/A';

  // ── 試合サマリー ──────────────────────────────────────────────
  const wins = matches.filter((m) => m.r === '勝ち').length;
  const winRate = pct(wins, matches.length);

  const recentTrend = (() => {
    const r = matches.slice(0, 5);
    if (!r.length) return 'データなし';
    const rate = r.filter((m) => m.r === '勝ち').length / r.length;
    return rate >= 0.7 ? '上昇中' : rate >= 0.45 ? '安定' : '要改善';
  })();

  const surfaceStats = ['ハード', 'クレー', 'グラス', 'カーペット'].map((surf) => {
    const g = matches.filter((m) => m.surf === surf);
    if (!g.length) return null;
    const w = g.filter((m) => m.r === '勝ち').length;
    return `${surf}: ${w}勝${g.length - w}敗 (${pct(w, g.length)})`;
  }).filter(Boolean).join(' / ');

  const recentMatches = matches.slice(0, 8).map((m) =>
    `  - ${m.d} vs ${m.o} [${m.surf}/${m.cond}] ${m.r} ${m.s}${m.memo ? ` ※${m.memo}` : ''}`
  ).join('\n');

  // ── スタッツサマリー ─────────────────────────────────────────
  const statsSection = stats.length === 0 ? 'スタッツ未記録' : (() => {
    const avgServe = avg((s) => (s.s1in / Math.max(s.s1tot, 1)) * 100);
    const avgS2 = avg((s) => (s.s2in / Math.max(s.s2tot, 1)) * 100);
    const avgAce = avg((s) => s.ace);
    const avgDf = avg((s) => s.df);
    const avgWin = avg((s) => s.win);
    const avgUfe = avg((s) => s.ufe);
    const avgBpSv = avg((s) => (s.bpsv / Math.max(s.bpfc, 1)) * 100);
    const avgBr = avg((s) => (s.br / Math.max(s.bp, 1)) * 100);

    const recentStatsRows = stats.slice(0, 5).map((s) =>
      `  - ${s.d} vs ${s.opp} [${s.surf}] 1st:${pct(s.s1in, s.s1tot)} Ace:${s.ace} DF:${s.df} W:${s.win} UFE:${s.ufe} BPsv:${pct(s.bpsv, s.bpfc)} Br:${pct(s.br, s.bp)}`
    ).join('\n');

    return `平均スタッツ (${stats.length}試合):
  1stサーブ: ${avgServe}% / 2ndサーブ: ${avgS2}%
  エース: ${avgAce} / DF: ${avgDf}
  ウィナー: ${avgWin} / UFE: ${avgUfe}
  BP防御率: ${avgBpSv}% / ブレーク率: ${avgBr}%

直近スタッツ詳細:
${recentStatsRows}`;
  })();

  // ── メモ ────────────────────────────────────────────────────
  const memoSection = memos.slice(0, 5).map((m) => `  - [${m.date}] ${m.text}`).join('\n') || 'なし';

  // ── レベル別コーチング指針 ───────────────────────────────────
  const levelGuide: Record<string, string> = {
    初心者: 'ラリー継続と基本フォームを最優先。難しい戦術より「ミスを減らす」意識を育てる。',
    中級者: '配球パターンとサーブ＋3球目の主導権を重視。弱点補強と得意パターンの確立を目指す。',
    上級者: 'ゲームプラン・スカウティング・BP場面の対応など試合マネジメントを強化。',
    競技者: 'データに基づく戦術立案と精神面の強化。試合の流れを読む判断力を磨く。',
  };
  const guide = levelGuide[settings.level] ?? '';

  return `あなたはプロのテニスコーチAIです。ユーザーは「${settings.name}」さん（プレイレベル：${settings.level}）です。

【コーチング指針】
${guide}
必ず日本語で回答し、データに基づいた具体的な指摘と実践的な改善策を提示してください。
返答はMarkdown形式（##見出し、箇条書き、**強調**）で構造化して読みやすくしてください。

【試合記録】
総合: ${matches.length}試合 ${wins}勝${matches.length - wins}敗 (勝率${winRate}) / 直近トレンド: ${recentTrend}
サーフェス別: ${surfaceStats || 'データなし'}

直近8試合:
${recentMatches || '  なし'}

【スタッツ分析】
${statsSection}

【プレイヤーメモ】
${memoSection}`;
}

function parseInferredStats(text: string): TennisStats | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || start >= end) return null;
  try {
    const p = JSON.parse(text.slice(start, end + 1)) as {
      s1in?: number; s1tot?: number; s2in?: number; s2tot?: number;
      ace?: number; df?: number; win?: number; ufe?: number;
      br?: number; bp?: number; bpsv?: number; bpfc?: number;
    };
    const nn = (v?: number, fallback = 0) => Math.max(v ?? fallback, 0);
    const nnPos = (v?: number, fallback = 1) => Math.max(v ?? fallback, 1);
    return {
      id: Date.now(), d: isoDay(), opp: '動画解析', fmt: 'シングルス', surf: 'ハード',
      s1in: nn(p.s1in), s1tot: nnPos(p.s1tot),
      s2in: nn(p.s2in), s2tot: nnPos(p.s2tot),
      ace: nn(p.ace), df: nn(p.df),
      win: nn(p.win), ufe: nn(p.ufe),
      br: nn(p.br), bp: nnPos(p.bp),
      bpsv: nn(p.bpsv), bpfc: nnPos(p.bpfc),
      s1pt: 0, s2pt: 0, race: 0, fe: 0, tpt: 0,
      rl1w: 0, rl1t: 1, rl4w: 0, rl4t: 1, rl9w: 0, rl9t: 1, bpw: 0, bpt: 1,
    };
  } catch { return null; }
}
