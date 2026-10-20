export interface SendResponse<T> {
  success?: boolean;
  statusCode?: number;
  info?: T;
  message?: string;
}

export interface Page<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture?: string;
  roleName: string;
  roleLabel: string;
  refId: string;
  source: 'mock' | 'live';
}

export interface Ambassador {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  company: string;
  source: 'jsonplaceholder' | 'local';
}

export type AmbassadorInput = Omit<Ambassador, 'id' | 'source'>;

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  imageUrl?: string;
  joined: boolean;
  source: 'mock' | 'live';
}

export interface Vendor {
  id: string;
  name: string;
  description: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  category: string;
  source: 'mock';
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  unread: number;
  source: 'mock' | 'live';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  body: string;
  sentAt: number;
  mine: boolean;
  pending?: boolean;
  failed?: boolean;
}

export interface DashboardSnapshot {
  communityCount: number | null;
  conversationCount: number | null;
  vendorCount: number | null;
  communityError?: string;
  conversationError?: string;
  vendorError?: string;
}
