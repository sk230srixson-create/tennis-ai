export type MatchFormat = 'シングルス' | 'ダブルス';
export type MatchResult = '勝ち' | '負け';
export type Surface = 'ハード' | 'クレー' | 'グラス' | 'カーペット';
export type Condition = '良い' | '普通' | '悪い';
export type PlayerLevel = '初心者' | '中級者' | '上級者' | '競技者';
export type CoachRole = 'user' | 'assistant';

export interface TennisMatch {
  id: number;
  d: string;
  o: string;
  fmt: MatchFormat;
  s: string;
  r: MatchResult;
  surf: Surface;
  cond: Condition;
  memo: string;
}

export interface TennisStats {
  id: number;
  d: string;
  opp: string;
  fmt: MatchFormat;
  surf: Surface;
  s1in: number;
  s1tot: number;
  s2in: number;
  s2tot: number;
  ace: number;
  df: number;
  s1pt: number;
  s2pt: number;
  br: number;
  bp: number;
  race: number;
  win: number;
  ufe: number;
  fe: number;
  tpt: number;
  rl1w: number;
  rl1t: number;
  rl4w: number;
  rl4t: number;
  rl9w: number;
  rl9t: number;
  bpw: number;
  bpt: number;
  bpsv: number;
  bpfc: number;
}

export interface TennisMemo {
  id: number;
  text: string;
  date: string;
}

export interface TennisSettings {
  name: string;
  level: PlayerLevel;
}

export interface CoachMessage {
  id: string;
  role: CoachRole;
  content: string;
}

export const MATCH_FORMATS: MatchFormat[] = ['シングルス', 'ダブルス'];
export const MATCH_RESULTS: MatchResult[] = ['勝ち', '負け'];
export const SURFACES: Surface[] = ['ハード', 'クレー', 'グラス', 'カーペット'];
export const CONDITIONS: Condition[] = ['良い', '普通', '悪い'];
export const PLAYER_LEVELS: PlayerLevel[] = ['初心者', '中級者', '上級者', '競技者'];
