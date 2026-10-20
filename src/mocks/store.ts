import {
  MOCK_EMAIL,
  MOCK_PASSWORD,
  mockCommunities,
  mockConversations,
  mockThread,
  mockUser,
  mockVendors,
} from '@/mocks/fixtures';
import type { ChatMessage, Community, Conversation, Page, SessionUser, Vendor } from '@/types/domain';

let communities = mockCommunities.map((item) => ({ ...item }));
let messages = mockThread();
let failChatSend = false;
let failVendors = false;
let failCommunities = false;

export function resetMockState(): void {
  communities = mockCommunities.map((item) => ({ ...item }));
  messages = mockThread();
  failChatSend = false;
  failVendors = false;
  failCommunities = false;
}

export function setMockFailure(kind: 'vendors' | 'communities' | 'chat-send', enabled: boolean): void {
  if (kind === 'vendors') failVendors = enabled;
  if (kind === 'communities') failCommunities = enabled;
  if (kind === 'chat-send') failChatSend = enabled;
}

export function authenticateMock(email: string, password: string): SessionUser {
  if (email.trim().toLowerCase() !== MOCK_EMAIL || password !== MOCK_PASSWORD) {
    throw new Error('Email or password is incorrect.');
  }
  return { ...mockUser };
}

function pageOf<T>(docs: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  const slice = docs.slice(start, start + pageSize);
  const totalPages = Math.ceil(docs.length / pageSize);
  return {
    docs: slice,
    totalDocs: docs.length,
    limit: pageSize,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function listMockCommunities(search: string, page: number, pageSize: number): Page<Community> {
  if (failCommunities) throw new Error('Community service is unavailable.');
  const query = search.trim().toLowerCase();
  const filtered = communities.filter((item) =>
    query ? `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query) : true,
  );
  return pageOf(filtered, page, pageSize);
}

export function getMockCommunity(id: string): Community {
  const found = communities.find((item) => item.id === id);
  if (!found) throw new Error('Community not found');
  return { ...found };
}

export function setMockMembership(id: string, joined: boolean): Community {
  const found = communities.find((item) => item.id === id);
  if (!found) throw new Error('Community not found');
  found.joined = joined;
  found.memberCount = Math.max(0, found.memberCount + (joined ? 1 : -1));
  return { ...found };
}

export function listMockVendors(search: string, category: string, page: number, pageSize: number): Page<Vendor> {
  if (failVendors) throw new Error('Vendor service is unavailable.');
  const query = search.trim().toLowerCase();
  const filtered = mockVendors.filter((item) => {
    const matchesQuery = query
      ? `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query)
      : true;
    const matchesCategory = category ? item.category === category : true;
    return matchesQuery && matchesCategory;
  });
  return pageOf(filtered, page, pageSize);
}

export function getMockVendor(id: string): Vendor {
  const found = mockVendors.find((item) => item.id === id);
  if (!found) throw new Error('Vendor not found');
  return { ...found };
}

export function listMockConversations(): Conversation[] {
  return mockConversations.map((item) => ({ ...item }));
}

export function listMockMessages(roomId: string): ChatMessage[] {
  return messages.filter((item) => item.roomId === roomId).map((item) => ({ ...item }));
}

export function sendMockMessage(roomId: string, body: string): ChatMessage {
  if (failChatSend) throw new Error('Message could not be sent.');
  const message: ChatMessage = {
    id: `mock-msg-${messages.length + 1}`,
    roomId,
    body,
    sentAt: Date.now(),
    mine: true,
  };
  messages = [...messages, message];
  return message;
}
