
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  youtubeSearchQuery?: string;
  timestamp: number;
}
