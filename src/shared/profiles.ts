import type { FormatProfile, ProfileId } from './types';

export const PROFILES: Record<ProfileId, FormatProfile> = {
  'best-video': {
    id: 'best-video',
    label: 'Best Video',
    description: 'bestvideo+bestaudio → MP4 (H.264/AAC)',
    args: [
      '-f',
      'bv*+ba/b',
      '--merge-output-format',
      'mp4',
      '--remux-video',
      'mp4'
    ]
  },
  'audio-mp3': {
    id: 'audio-mp3',
    label: 'Audio · MP3 320kbps',
    description: 'Extract audio, encode MP3 @ 320kbps',
    args: ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0']
  },
  'audio-flac': {
    id: 'audio-flac',
    label: 'Audio · FLAC',
    description: 'Extract audio, lossless FLAC',
    args: ['-f', 'ba/b', '-x', '--audio-format', 'flac']
  },
  'audio-m4a': {
    id: 'audio-m4a',
    label: 'Audio · M4A',
    description: 'Extract audio, remux to M4A',
    args: ['-f', 'ba[ext=m4a]/ba/b', '-x', '--audio-format', 'm4a']
  },
  'video-4k': {
    id: 'video-4k',
    label: 'Video · 4K',
    description: 'Cap at 2160p, merged MP4',
    args: [
      '-f',
      'bv*[height<=2160]+ba/b[height<=2160]',
      '--merge-output-format',
      'mp4'
    ]
  },
  'video-1080p': {
    id: 'video-1080p',
    label: 'Video · 1080p',
    description: 'Cap at 1080p, merged MP4',
    args: [
      '-f',
      'bv*[height<=1080]+ba/b[height<=1080]',
      '--merge-output-format',
      'mp4'
    ]
  },
  'video-720p': {
    id: 'video-720p',
    label: 'Video · 720p',
    description: 'Cap at 720p, merged MP4',
    args: [
      '-f',
      'bv*[height<=720]+ba/b[height<=720]',
      '--merge-output-format',
      'mp4'
    ]
  },
  'video-480p': {
    id: 'video-480p',
    label: 'Video · 480p',
    description: 'Cap at 480p, merged MP4',
    args: [
      '-f',
      'bv*[height<=480]+ba/b[height<=480]',
      '--merge-output-format',
      'mp4'
    ]
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Use your own yt-dlp flags',
    args: []
  }
};

export const PROFILE_LIST: FormatProfile[] = Object.values(PROFILES);
