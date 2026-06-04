import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { useStore } from '../../store/useStore';
import { Colors, gradientColors, shared } from '../../constants/theme';
import { CoachMessage } from '../../constants/types';

// ── Sub-components ──────────────────────────────────────────────

function HeroCard() {
  const { settings, stats } = useStore((s) => ({ settings: s.settings, stats: s.stats }));
  return (
    <View style={[shared.card, styles.heroCard]}>
      <View style={[shared.row, { marginBottom: 12 }]}>
        <Ionicons name="tennisball" size={36} color={Colors.lime} />
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{settings.level}</Text>
        </View>
      </View>
      <Text style={styles.heroTitle}>{settings.name}さんの{'\n'}勝ち筋をAIが整理</Text>
      <Text style={styles.heroSub}>直近5試合・サーブ率・ウィナー/UFEを文脈に、前向きな日本語コーチングを返します。</Text>
    </View>
  );
}

function QuickQuestions({ onSend }: { onSend: (t: string) => void }) {
  const items = [
    { label: '💪 メンタル', text: 'メンタル面のアドバイスをください' },
    { label: '🧠 戦術', text: '戦術について相談したいです' },
    { label: '📋 練習', text: '今の状態に合う練習メニューを提案してください' },
    { label: '📊 分析', text: '試合データを分析してアドバイスをください' },
  ];
  return (
    <View style={styles.quickGrid}>
      {items.map((item) => (
        <Pressable key={item.label} style={styles.quickBtn} onPress={() => onSend(item.text)}>
          <Text style={styles.quickBtnText}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Inline renderer: bold + clickable time refs ──────────────────

// Matches "3:42" or "3:42〜5:10"
const TIME_PATTERN = /(\d+:\d{2}(?:〜\d+:\d{2})?)/g;

function toSeconds(ts: string): number {
  const [m, s] = ts.split(':');
  return parseInt(m, 10) * 60 + parseInt(s, 10);
}

function renderInline(
  text: string,
  hasVideo: boolean,
  seekVideoTo: (s: number) => void,
): React.ReactNode {
  // Split by time pattern first, then handle bold within text segments
  const segments = text.split(TIME_PATTERN);
  return segments.map((seg, i) => {
    if (TIME_PATTERN.test(seg)) {
      TIME_PATTERN.lastIndex = 0; // reset after test
      const startTs = seg.split('〜')[0];
      const startSec = toSeconds(startTs);
      return (
        <Text
          key={i}
          onPress={hasVideo ? () => seekVideoTo(startSec) : undefined}
          style={hasVideo ? styles.timeChip : styles.timeChipInactive}
        >
          {hasVideo ? '▶ ' : ''}{seg}
        </Text>
      );
    }
    TIME_PATTERN.lastIndex = 0;
    // Apply bold within regular text
    const boldParts = seg.split(/(\*\*[^*]+\*\*)/g);
    if (boldParts.length === 1) return seg || null;
    return (
      <React.Fragment key={i}>
        {boldParts.map((p, j) =>
          /^\*\*[^*]+\*\*$/.test(p)
            ? <Text key={j} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>
            : p
        )}
      </React.Fragment>
    );
  });
}

// ── Markdown renderer ─────────────────────────────────────────────

function renderMarkdown(
  text: string,
  hasVideo: boolean,
  seekVideoTo: (s: number) => void,
) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^##\s/.test(line)) {
      elements.push(
        <Text key={key++} style={styles.mdH2}>
          {renderInline(line.replace(/^##\s+/, ''), hasVideo, seekVideoTo)}
        </Text>
      );
      continue;
    }
    if (/^###\s/.test(line)) {
      elements.push(
        <Text key={key++} style={styles.mdH3}>
          {renderInline(line.replace(/^###\s+/, ''), hasVideo, seekVideoTo)}
        </Text>
      );
      continue;
    }
    if (/^[-•]\s/.test(line)) {
      const content = line.replace(/^[-•]\s+/, '');
      elements.push(
        <View key={key++} style={styles.mdBulletRow}>
          <Text style={styles.mdBulletDot}>•</Text>
          <Text style={styles.mdBulletText}>
            {renderInline(content, hasVideo, seekVideoTo)}
          </Text>
        </View>
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1] ?? '';
      const content = line.replace(/^\d+\.\s+/, '');
      elements.push(
        <View key={key++} style={styles.mdBulletRow}>
          <Text style={styles.mdBulletDot}>{num}.</Text>
          <Text style={styles.mdBulletText}>
            {renderInline(content, hasVideo, seekVideoTo)}
          </Text>
        </View>
      );
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      elements.push(<View key={key++} style={styles.mdDivider} />);
      continue;
    }
    if (line.trim() === '') {
      elements.push(<View key={key++} style={{ height: 6 }} />);
      continue;
    }
    elements.push(
      <Text key={key++} style={styles.mdParagraph}>
        {renderInline(line, hasVideo, seekVideoTo)}
      </Text>
    );
  }
  return elements;
}

// ── Video Player Panel ────────────────────────────────────────────

function VideoPlayerPanel() {
  const analyzedVideoUri = useStore((s) => s.analyzedVideoUri);
  const videoSeekTarget = useStore((s) => s.videoSeekTarget);
  const clearVideoSeek = useStore((s) => s.clearVideoSeek);
  const [collapsed, setCollapsed] = useState(false);
  const videoRef = useRef<any>(null);

  useEffect(() => {
    if (videoSeekTarget !== null && videoRef.current) {
      videoRef.current.currentTime = videoSeekTarget;
      videoRef.current.play?.();
      clearVideoSeek();
    }
  }, [videoSeekTarget]);

  if (!analyzedVideoUri || Platform.OS !== 'web') return null;

  return (
    <View style={styles.videoPanel}>
      <Pressable onPress={() => setCollapsed((c) => !c)} style={styles.videoPanelHeader}>
        <Ionicons name="videocam" size={14} color={Colors.lime} />
        <Text style={styles.videoPanelTitle}>アップロード済み動画</Text>
        <Text style={styles.videoPanelHint}>タイムスタンプをタップで自動ジャンプ</Text>
        <Ionicons
          name={collapsed ? 'chevron-down-outline' : 'chevron-up-outline'}
          size={14}
          color={Colors.subtext}
        />
      </Pressable>
      {!collapsed &&
        React.createElement('video', {
          ref: videoRef,
          src: analyzedVideoUri,
          controls: true,
          style: {
            width: '100%',
            maxHeight: 220,
            borderRadius: 8,
            backgroundColor: '#000',
            display: 'block',
            marginTop: 8,
          },
        })
      }
    </View>
  );
}

// ── Message Bubble ────────────────────────────────────────────────

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === 'user';
  const analyzedVideoUri = useStore((s) => s.analyzedVideoUri);
  const seekVideoTo = useStore((s) => s.seekVideoTo);

  if (isUser) {
    return (
      <View style={[styles.bubble, styles.bubbleUser]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, styles.bubbleAI]}>
      {renderMarkdown(message.content, !!analyzedVideoUri, seekVideoTo)}
    </View>
  );
}

function TypingDots() {
  return (
    <View style={styles.typingWrap}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.dot} />
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────

const QUICK_LABELS = ['白いウェア', '赤いシャツ', '手前の選手', '奥の選手'];

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [targetPlayer, setTargetPlayer] = useState('');

  const {
    history, isTyping, videoProgress, settings, pendingInferredStats,
    sendCoach, analyzeVideo, confirmInferredStats, dismissInferredStats, showToast,
  } = useStore();

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendCoach(text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleVideoUpload = async () => {
    const playerDesc = targetPlayer.trim() || '手前の選手';

    if (Platform.OS === 'web') {
      await new Promise<void>((resolve) => {
        // eslint-disable-next-line no-undef
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) { resolve(); return; }
          // eslint-disable-next-line no-undef
          const uri = URL.createObjectURL(file);
          try {
            await analyzeVideo(uri, playerDesc);
            showToast('動画解析が完了しました');
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            Alert.alert('エラー', msg);
          } finally {
            resolve();
          }
        };
        input.click();
      });
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      await analyzeVideo(result.assets[0].uri, playerDesc);
      showToast('動画解析が完了しました');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('エラー', msg);
    }
  };

  const handleConfirmStats = () => {
    if (!pendingInferredStats) return;
    const msg = `推定サーブ統計を保存しますか？\n1st ${pendingInferredStats.s1in}/${pendingInferredStats.s1tot} DF ${pendingInferredStats.df}`;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-undef
      if (window.confirm(msg)) {
        confirmInferredStats();
        showToast('スタッツに保存しました');
      } else {
        dismissInferredStats();
      }
      return;
    }
    Alert.alert(
      '推定サーブ統計を保存しますか？',
      `1st ${pendingInferredStats.s1in}/${pendingInferredStats.s1tot} DF ${pendingInferredStats.df}`,
      [
        { text: '破棄', style: 'destructive', onPress: dismissInferredStats },
        {
          text: '保存', onPress: () => {
            confirmInferredStats();
            showToast('スタッツに保存しました');
          },
        },
      ],
    );
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <Header title="AIコーチ" />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="always"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <HeroCard />
          <QuickQuestions onSend={(t) => { sendCoach(t); }} />

          <View style={styles.playerSelector}>
            <Text style={styles.playerSelectorLabel}>分析する選手の特徴</Text>
            <Text style={styles.playerSelectorHint}>
              外見で指定するとコートチェンジ後も追跡できます
            </Text>
            <TextInput
              style={styles.playerInput}
              value={targetPlayer}
              onChangeText={setTargetPlayer}
              placeholder="例：白いウェア、赤いシャツ、手前の選手"
              placeholderTextColor={Colors.subtext2}
            />
            <View style={styles.playerSelectorRow}>
              {QUICK_LABELS.map((label) => (
                <Pressable
                  key={label}
                  style={[styles.playerBtn, targetPlayer === label && styles.playerBtnActive]}
                  onPress={() => setTargetPlayer(label)}
                >
                  <Text style={[styles.playerBtnText, targetPlayer === label && styles.playerBtnTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={styles.videoBtn} onPress={handleVideoUpload}>
            <Ionicons name="videocam-outline" size={20} color="#000" />
            <Text style={styles.videoBtnText}>試合動画をアップロードして解析</Text>
          </Pressable>
          {videoProgress !== '' && (
            <Text style={styles.progress}>{videoProgress}</Text>
          )}
          <VideoPlayerPanel />
          {pendingInferredStats && (
            <Pressable style={styles.inferBanner} onPress={handleConfirmStats}>
              <Text style={styles.inferText}>
                推定サーブ統計あり — タップして確認
              </Text>
            </Pressable>
          )}

          {history.map((m) => <MessageBubble key={m.id} message={m} />)}
          {isTyping && <TypingDots />}
        </ScrollView>
        {/* Chat input */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="AIコーチに相談…"
            placeholderTextColor={Colors.subtext}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="arrow-up" size={20} color="#000" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { padding: 16, gap: 12, paddingBottom: 16 },

  heroCard: {
    marginBottom: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  heroTitle: { color: Colors.text, fontSize: 26, fontWeight: '900', lineHeight: 32, marginBottom: 6 },
  heroSub: { color: Colors.subtext, fontSize: 13, lineHeight: 18 },
  levelBadge: {
    marginLeft: 'auto',
    backgroundColor: `${Colors.cyan}29`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelBadgeText: { color: Colors.cyan, fontSize: 12, fontWeight: '700' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 13,
    alignItems: 'center',
  },
  quickBtnText: { color: Colors.text, fontSize: 13, fontWeight: '700' },

  apiHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  apiHintText: { color: '#FFD700', fontSize: 12, flex: 1, lineHeight: 17 },

  playerSelector: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  playerSelectorLabel: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  playerSelectorHint: {
    color: Colors.subtext2,
    fontSize: 11,
    lineHeight: 15,
    marginTop: -4,
  },
  playerInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  playerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerBtnActive: {
    backgroundColor: `${Colors.cyan}33`,
    borderColor: Colors.cyan,
  },
  playerBtnText: { color: Colors.subtext, fontSize: 12, fontWeight: '600' },
  playerBtnTextActive: { color: Colors.cyan },

  videoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.lime,
    borderRadius: 18,
    padding: 16,
  },
  videoBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },

  progress: { color: Colors.cyan, fontSize: 12, fontWeight: '700' },

  // Video player panel
  videoPanel: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: `${Colors.lime}44`,
  },
  videoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoPanelTitle: {
    color: Colors.lime,
    fontSize: 12,
    fontWeight: '700',
  },
  videoPanelHint: {
    color: Colors.subtext,
    fontSize: 10,
    flex: 1,
  },

  // Clickable time chips (inline in text)
  timeChip: {
    color: Colors.lime,
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: `${Colors.lime}22`,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  timeChipInactive: {
    color: Colors.subtext,
    fontSize: 13,
  },

  inferBanner: {
    backgroundColor: `${Colors.cyan}22`,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Colors.cyan}44`,
  },
  inferText: { color: Colors.cyan, fontWeight: '700', fontSize: 13, textAlign: 'center' },

  bubble: {
    maxWidth: '88%',
    padding: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: `${Colors.cyan}55`,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bubbleText: { color: Colors.text, fontSize: 14, lineHeight: 20 },

  mdH2: {
    color: Colors.lime,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 2,
  },
  mdH3: {
    color: Colors.cyan,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  mdParagraph: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  mdBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 2,
  },
  mdBulletDot: {
    color: Colors.cyan,
    fontSize: 14,
    lineHeight: 21,
    width: 16,
  },
  mdBulletText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  mdDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 8,
  },

  typingWrap: {
    flexDirection: 'row',
    gap: 5,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.cyan },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
