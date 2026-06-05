import { Platform } from 'react-native';

const NUM_SEGMENTS = 8;
const FRAMES_PER_SEGMENT = 3;

export interface VideoSegment {
  frames: string[];
  startSec: number;
  endSec: number;
}

export async function extractVideoFrames(uri: string): Promise<VideoSegment[]> {
  if (Platform.OS === 'web') {
    return extractFramesWeb(uri);
  }
  return extractFramesMobile(uri);
}

function extractFramesWeb(uri: string): Promise<VideoSegment[]> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-undef
    const video = document.createElement('video') as HTMLVideoElement;
    video.muted = true;
    video.preload = 'metadata';
    video.src = uri;

    video.onerror = () => reject(new Error('動画の読み込みに失敗しました'));

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        reject(new Error('動画の長さを取得できませんでした'));
        return;
      }

      // eslint-disable-next-line no-undef
      const canvas = document.createElement('canvas') as HTMLCanvasElement;
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;

      const results: VideoSegment[] = Array.from({ length: NUM_SEGMENTS }, (_, seg) => ({
        frames: [],
        startSec: (duration * seg) / NUM_SEGMENTS,
        endSec: (duration * (seg + 1)) / NUM_SEGMENTS,
      }));

      const jobs: Array<{ seg: number; time: number }> = [];
      for (let seg = 0; seg < NUM_SEGMENTS; seg++) {
        const { startSec, endSec } = results[seg];
        for (let f = 0; f < FRAMES_PER_SEGMENT; f++) {
          const t = startSec + ((endSec - startSec) * f) / Math.max(FRAMES_PER_SEGMENT - 1, 1);
          jobs.push({ seg, time: t });
        }
      }

      let idx = 0;
      const next = () => {
        if (idx >= jobs.length) {
          resolve(results);
          return;
        }
        const { seg, time } = jobs[idx];
        video.currentTime = time;
        video.onseeked = () => {
          try {
            ctx.drawImage(video, 0, 0, 640, 360);
            const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            results[seg].frames.push(b64);
          } catch {
            // skip frame on draw error
          }
          idx++;
          next();
        };
      };
      next();
    };

    video.load();
  });
}

async function extractFramesMobile(uri: string): Promise<VideoSegment[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const VideoThumbnails = require('expo-video-thumbnails') as typeof import('expo-video-thumbnails');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require('expo-file-system') as typeof import('expo-file-system');

    const estimatedDuration = 90;
    const results: VideoSegment[] = Array.from({ length: NUM_SEGMENTS }, (_, seg) => ({
      frames: [],
      startSec: (estimatedDuration * seg) / NUM_SEGMENTS,
      endSec: (estimatedDuration * (seg + 1)) / NUM_SEGMENTS,
    }));

    for (let seg = 0; seg < NUM_SEGMENTS; seg++) {
      const { startSec, endSec } = results[seg];
      for (let f = 0; f < FRAMES_PER_SEGMENT; f++) {
        const time = startSec + ((endSec - startSec) * f) / Math.max(FRAMES_PER_SEGMENT - 1, 1);
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
            time: Math.round(time * 1000),
            quality: 0.85,
          });
          const b64 = await FileSystem.readAsStringAsync(thumbUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          results[seg].frames.push(b64);
        } catch {
          // skip frame
        }
      }
    }

    return results;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`動画フレームの抽出に失敗しました: ${msg}`);
  }
}
