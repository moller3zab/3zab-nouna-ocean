export type Identity = '3zab' | 'Nouna';

export interface Milestone {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  location?: string;
  description: string;
  tags?: string[];
  photos?: string[];
  createdBy?: Identity;
  createdAt?: number;
}

export interface Memory {
  id: string;
  title: string;
  date: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  tag: string;
  createdBy: Identity;
  likes: number;
  createdAt: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  platform: 'spotify' | 'youtube' | 'sound-cloud' | 'other';
  url: string;
  coverUrl?: string;
  note?: string;
  duration?: string;
  createdBy: Identity;
  createdAt: number;
}

export interface LoveReason {
  id: string;
  author: Identity;
  text: string;
  note?: string;
  createdAt: number;
}

export interface Letter {
  id: string;
  author: Identity;
  recipient: Identity;
  title: string;
  message: string;
  createdAt: number;
}

export interface OpenWhen {
  id: string;
  author: Identity;
  category: string;
  title: string;
  message: string;
  createdAt: number;
}

export interface Thing21 {
  id: string;
  number: number;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: number;
}

export interface FutureDream {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: number;
  createdBy: Identity;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  sender: Identity;
  text: string;
  imageUrl?: string;
  reactions?: Record<string, number>;
  createdAt: number;
}

export interface PeaceResponse {
  happened: string;
  feeling: string;
  understand: string;
  sorryFor: string;
  wantToDo: string;
  submittedAt: number;
}

export interface PeaceRoomData {
  user3zab?: PeaceResponse;
  userNouna?: PeaceResponse;
  reconciled: boolean;
  updatedAt: number;
}

export interface Favorite {
  id: string;
  author: Identity;
  category: string;
  item: string;
  icon: 'utensils' | 'coffee' | 'tv' | 'globe' | 'zap' | 'heart';
  color: 'red' | 'amber' | 'purple' | 'blue' | 'orange' | 'emerald' | 'stone' | 'teal';
  createdAt: number;
}

export interface Polaroid {
  id: string;
  imageUrl: string;
  note: string;
  date: string;
  createdBy: Identity;
  x: number;
  y: number;
  rotation: number;
  createdAt: number;
}

export interface Notification {
  id: string;
  type: 'memory' | 'song' | 'reason' | 'letter' | 'open_when' | 'thing21' | 'favorite' | 'future' | 'chat';
  message: string;
  linkId: string;
  isRead: boolean;
  createdAt: number;
}

export interface MoodStatus {
  identity: Identity;
  mood: string;
  emoji: string;
  message: string;
  updatedAt: number;
}

export interface Countdown {
  id: string;
  title: string;
  targetDate: string; // ISO string
  icon: 'calendar' | 'heart' | 'plane' | 'star';
  createdAt: number;
}
