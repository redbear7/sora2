
export interface SceneBreakdown {
  subjects: string;
  characters: string; 
  environmentLighting: string;
  visualAnchors: string[];
}

export interface ThemeStory {
  theme: string;
  logline: string;
  emotionalArc: {
    setup: string;
    build: string;
    turn: string;
    payoff: string;
  };
}

export interface CinematicApproach {
  shotProgression: string;
  cameraMovement: string;
  lensExposure: string;
  lightColor: string;
}

export interface Keyframe {
  id: number;
  shotType: string;
  duration: string;
  composition: string;
  action: string;
  dialogue: string;
  camera: string;
  lensDoF: string;
  lighting: string;
  sound: string;
}

export interface StoryboardData {
  sourceScript?: string; 
  breakdown: SceneBreakdown;
  theme: ThemeStory;
  approach: CinematicApproach;
  keyframes: Keyframe[];
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  STORYBOARD = 'STORYBOARD',
  EDITOR = 'EDITOR',
  HISTORY = 'HISTORY'
}

export type VideoModel = 'VEO3' | 'Sora2';
export type VideoDuration = '8s' | '10s' | '15s';
export type ImageGenModel = 'Nano Banana' | 'Nano Banana Pro';
export type InputType = 'IMAGE' | 'TEXT';
export type AspectRatio = '9:16' | '16:9';

export interface GenerationOptions {
  model: VideoModel;
  duration: VideoDuration;
  imageModel: ImageGenModel;
  inputType: InputType;
  aspectRatio: AspectRatio;
}

export interface SavedStoryboard {
  id: string;
  timestamp: number;
  data: StoryboardData;
  options: GenerationOptions;
  previewImage?: string; 
}
