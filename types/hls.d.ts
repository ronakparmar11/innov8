// Type declarations for hls.js
// This ensures proper TypeScript support for HLS.js library

declare module "hls.js" {
  export interface HlsConfig {
    enableWorker?: boolean;
    lowLatencyMode?: boolean;
    backBufferLength?: number;
    maxBufferLength?: number;
    maxMaxBufferLength?: number;
    liveSyncDurationCount?: number;
    liveMaxLatencyDurationCount?: number;
    startLevel?: number;
    autoStartLoad?: boolean;
    debug?: boolean;
    [key: string]: any;
  }

  export interface Level {
    bitrate: number;
    width: number;
    height: number;
    name: string;
    url: string[];
    [key: string]: any;
  }

  export interface HlsEventData {
    fatal: boolean;
    type: string;
    details: string;
    frag?: any;
    response?: any;
    [key: string]: any;
  }

  export default class Hls {
    static isSupported(): boolean;
    static Events: {
      MEDIA_ATTACHED: string;
      MEDIA_DETACHED: string;
      MANIFEST_LOADING: string;
      MANIFEST_LOADED: string;
      MANIFEST_PARSED: string;
      LEVEL_SWITCHING: string;
      LEVEL_SWITCHED: string;
      LEVEL_LOADING: string;
      LEVEL_LOADED: string;
      LEVEL_UPDATED: string;
      LEVEL_PTS_UPDATED: string;
      AUDIO_TRACKS_UPDATED: string;
      AUDIO_TRACK_SWITCHING: string;
      AUDIO_TRACK_SWITCHED: string;
      AUDIO_TRACK_LOADING: string;
      AUDIO_TRACK_LOADED: string;
      SUBTITLE_TRACKS_UPDATED: string;
      SUBTITLE_TRACK_SWITCH: string;
      SUBTITLE_TRACK_LOADING: string;
      SUBTITLE_TRACK_LOADED: string;
      SUBTITLE_FRAG_PROCESSED: string;
      INIT_PTS_FOUND: string;
      FRAG_LOADING: string;
      FRAG_LOAD_PROGRESS: string;
      FRAG_LOAD_EMERGENCY_ABORTED: string;
      FRAG_LOADED: string;
      FRAG_DECRYPTED: string;
      FRAG_PARSING_INIT_SEGMENT: string;
      FRAG_PARSING_USERDATA: string;
      FRAG_PARSING_METADATA: string;
      FRAG_PARSING_DATA: string;
      FRAG_PARSED: string;
      FRAG_BUFFERED: string;
      FRAG_CHANGED: string;
      FPS_DROP: string;
      FPS_DROP_LEVEL_CAPPING: string;
      ERROR: string;
      DESTROYING: string;
      KEY_LOADING: string;
      KEY_LOADED: string;
      BUFFER_RESET: string;
      BUFFER_CODECS: string;
      BUFFER_CREATED: string;
      BUFFER_APPENDING: string;
      BUFFER_APPENDED: string;
      BUFFER_EOS: string;
      BUFFER_FLUSHING: string;
      BUFFER_FLUSHED: string;
    };
    static ErrorTypes: {
      NETWORK_ERROR: string;
      MEDIA_ERROR: string;
      KEY_SYSTEM_ERROR: string;
      MUX_ERROR: string;
      OTHER_ERROR: string;
    };
    static ErrorDetails: {
      [key: string]: string;
    };

    constructor(config?: HlsConfig);
    loadSource(url: string): void;
    attachMedia(media: HTMLMediaElement): void;
    detachMedia(): void;
    startLoad(startPosition?: number): void;
    stopLoad(): void;
    recoverMediaError(): void;
    destroy(): void;
    on(
      event: string,
      callback: (event: string, data: HlsEventData) => void,
    ): void;
    off(
      event: string,
      callback?: (event: string, data: HlsEventData) => void,
    ): void;
    once(
      event: string,
      callback: (event: string, data: HlsEventData) => void,
    ): void;

    levels: Level[];
    currentLevel: number;
    nextLevel: number;
    loadLevel: number;
    startLevel: number;
    autoLevelEnabled: boolean;
    autoLevelCapping: number;
    media: HTMLMediaElement | null;
  }
}
