export interface CommentData {
  id: string;
  user: string;
  content: string;
  platform: 'xiaohongshu' | 'weibo' | 'twitter';
  timestamp: string;
  likes: number;
  status: 'pending' | 'cleaning_keyword' | 'cleaning_semantic' | 'accepted' | 'rejected';
  rejectionReason?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface TaskConfig {
  entity: string;
  platform: string;
  timeRange: string;
  query: string;
}

export interface AgentNode {
  id: string;
  type: 'dataset' | 'agent' | 'output';
  label: string;
  x: number;
  y: number;
  status: 'idle' | 'running' | 'completed';
  prompt?: string;
}

export interface ReportSection {
  id: string;
  content: string;
  evidenceIds: string[];
}

// --- New Types for Module 1.5 ---
export interface CrawlItem {
  id: string;
  type: 'post' | 'comment' | 'sub-comment';
  user: string;
  avatarColor?: string;
  content: string;
  platform: 'xiaohongshu' | 'weibo' | 'web';
  timestamp: string;
  children?: CrawlItem[]; // Nested replies
  rawJson?: object; // For Inspector
}
