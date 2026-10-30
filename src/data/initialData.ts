import type { Milestone, Memory, Song, LoveReason, Letter, OpenWhen, Thing21, FutureDream, ChatMessage, Favorite, Polaroid } from '../types';
// Empty initial states; journal content arrives exclusively from Firestore.
export const INITIAL_MILESTONES: Milestone[] = [];
export const INITIAL_MEMORIES: Memory[] = [];
export const INITIAL_POLAROIDS: Polaroid[] = [];
export const INITIAL_SONGS: Song[] = [];
export const INITIAL_REASONS: LoveReason[] = [];
export const INITIAL_LETTERS: Letter[] = [];
export const INITIAL_OPEN_WHEN: OpenWhen[] = [];
export const INITIAL_THINGS21: Thing21[] = [];
export const INITIAL_FUTURE_DREAMS: FutureDream[] = [];
export const INITIAL_MESSAGES: ChatMessage[] = [];
export const INITIAL_FAVORITES: Favorite[] = [];
