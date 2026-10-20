import { describe, expect, it } from 'vitest';
import {
  classifyParentMessage,
  frameAncestorsDirective,
  isAllowedParentOrigin,
  resolveFrameAncestors,
} from '@/config/framePolicy';
import { layoutFromWidth } from '@/hooks/useContainerLayout';
import { resolveAuthMode } from '@/config/env';
import { validateEmail, validateMockPassword } from '@/features/auth/credentials';
import { mapCommunity } from '@/services/intotoApi';
import { authenticateMock, listMockCommunities, sendMockMessage, setMockFailure } from '@/mocks/store';

describe('frame policy', () => {
  it('denies framing in production when no parents are configured', () => {
    expect(frameAncestorsDirective(resolveFrameAncestors(undefined, false))).toBe("frame-ancestors 'none'");
  });

  it('allows only the configured parent origins', () => {
    const origins = resolveFrameAncestors('http://localhost:5199, javascript:alert(1)', true);
    expect(origins).toEqual(['http://localhost:5199']);
    expect(frameAncestorsDirective(origins)).toBe('frame-ancestors http://localhost:5199');
    expect(isAllowedParentOrigin('http://localhost:5199', origins)).toBe(true);
    expect(isAllowedParentOrigin('https://evil.example', origins)).toBe(false);
  });

  it('ignores parent messages that carry tokens or identity claims', () => {
    expect(classifyParentMessage({ type: 'intoto:ping' })).toBe('ping');
    expect(classifyParentMessage({ type: 'intoto:ping', accessToken: 'secret' })).toBe('ignore');
    expect(classifyParentMessage({ type: 'intoto:user', email: 'a@b.c' })).toBe('ignore');
  });
});

describe('auth mode', () => {
  it('stays on the mock adapter unless Auth0 is configured', () => {
    expect(resolveAuthMode('live', '', '')).toBe('mock');
    expect(resolveAuthMode('live', 'tenant.auth0.com', 'client')).toBe('live');
  });

  it('rejects an invalid mock login and accepts the labeled demo account', () => {
    expect(validateEmail('not-an-email')).toMatch(/valid email/);
    expect(validateMockPassword('')).toMatch(/password/);
    expect(() => authenticateMock('person@example.com', 'nope')).toThrow(/incorrect/i);
    expect(authenticateMock('ambassador@intoto.example', 'ambassador').roleName).toBe('external_ambassador');
  });
});

describe('communities and vendors', () => {
  it('drops communities that have no id and marks joined ids', () => {
    const mapped = mapCommunity({ _id: 'abc', name: 'Hosts', joined: 3 }, new Set(['abc']));
    expect(mapped).toMatchObject({ id: 'abc', joined: true, source: 'live', memberCount: 3 });
    expect(mapCommunity({ name: 'Missing id' }, new Set())).toBeNull();
  });

  it('hides communities when the mock service fails and still lists the rest', () => {
    setMockFailure('communities', true);
    expect(() => listMockCommunities('', 1, 8)).toThrow(/unavailable/i);
  });
});

describe('chat', () => {
  it('records a sent message and surfaces a send failure', () => {
    const saved = sendMockMessage('mock-room-1', 'Hello');
    expect(saved.mine).toBe(true);
    expect(saved.body).toBe('Hello');
    setMockFailure('chat-send', true);
    expect(() => sendMockMessage('mock-room-1', 'Again')).toThrow(/could not be sent/i);
  });
});

describe('responsive layout', () => {
  it('uses the iframe width rather than assuming a desktop window', () => {
    expect(layoutFromWidth(390)).toBe('compact');
    expect(layoutFromWidth(800)).toBe('tablet');
    expect(layoutFromWidth(1280)).toBe('desktop');
  });
});
