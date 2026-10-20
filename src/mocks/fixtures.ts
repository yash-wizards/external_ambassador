import type { ChatMessage, Community, Conversation, SessionUser, Vendor } from '@/types/domain';

export const MOCK_EMAIL = 'ambassador@intoto.example';
export const MOCK_PASSWORD = 'ambassador';

export const mockUser: SessionUser = {
  id: 'mock-user',
  email: MOCK_EMAIL,
  name: 'Avery Chen',
  firstName: 'Avery',
  lastName: 'Chen',
  roleName: 'external_ambassador',
  roleLabel: 'External Ambassador',
  refId: 'mock-ref',
  source: 'mock',
};

export const mockCommunities: Community[] = [
  {
    id: 'mock-community-1',
    name: 'Arrival Circle',
    description: 'Sample community for students who have just arrived. This record is not from the INTOTO API.',
    memberCount: 42,
    category: 'Campus life',
    joined: true,
    source: 'mock',
  },
  {
    id: 'mock-community-2',
    name: 'City Hosts',
    description: 'Sample community for local hosts. This record is not from the INTOTO API.',
    memberCount: 18,
    category: 'Housing',
    joined: false,
    source: 'mock',
  },
];

export const mockVendors: Vendor[] = [
  {
    id: 'mock-vendor-1',
    name: 'Northline Housing',
    description: 'Sample housing partner. INTOTO does not currently expose a vendor API, so this record is mock data.',
    contactEmail: 'hello@northline.example',
    contactPhone: '+1 555 0100',
    website: 'https://example.com',
    category: 'Housing',
    source: 'mock',
  },
  {
    id: 'mock-vendor-2',
    name: 'Harbor Transfers',
    description: 'Sample transport partner. Contact details here are fictional and are not authorized vendor data.',
    contactEmail: 'desk@harbor.example',
    category: 'Transport',
    source: 'mock',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'mock-room-1',
    title: 'Student support',
    preview: 'Welcome to the sample conversation.',
    updatedAt: Date.now() - 60_000,
    unread: 1,
    source: 'mock',
  },
];

export function mockThread(): ChatMessage[] {
  return [
    {
      id: 'mock-msg-1',
      roomId: 'mock-room-1',
      body: 'Welcome to the sample conversation.',
      sentAt: Date.now() - 60_000,
      mine: false,
    },
  ];
}
