import { endpoints, EXTERNAL_AMBASSADOR_ROLE } from '@/config/endpoints';
import type { AppConfig } from '@/config/env';
import { dedupe, request, type HttpContext } from '@/services/http';
import type { Page, SendResponse } from '@/types/domain';
import type { Community, SessionUser } from '@/types/domain';

interface LoginInfo {
  _id?: string;
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  picture?: string;
}

interface ActiveRole {
  name?: string;
  displayName?: string;
  active?: boolean;
}

interface PortfolioSession {
  _id?: string;
  rolename?: string;
  role?: { name?: string; displayName?: string };
}

interface CommunityDoc {
  _id?: string;
  name?: string;
  desc?: string;
  description?: string;
  joined?: number;
  memberCount?: number;
  profileImage?: string;
  coverImage?: string;
  category?: { displayName?: string; name?: string } | string;
  isMember?: boolean;
}

interface JoinedDoc {
  _id?: string;
  communityId?: string;
  community?: { _id?: string };
}

export function createHttpContext(
  config: AppConfig,
  access: {
    getAccessToken: () => string | null;
    getRefId: () => string | null;
    getDeviceId: () => string;
    refreshAccessToken: () => Promise<string | null>;
    onUnauthorized: () => void;
  },
): HttpContext {
  return { baseUrl: config.apiBaseUrl, timeoutMs: config.timeoutMs, ...access };
}

export function mapCommunity(doc: CommunityDoc, joinedIds: Set<string>): Community | null {
  const id = doc._id?.trim();
  if (!id) return null;
  const category =
    typeof doc.category === 'string'
      ? doc.category
      : doc.category?.displayName || doc.category?.name || 'Community';
  return {
    id,
    name: doc.name?.trim() || 'Untitled community',
    description: doc.desc?.trim() || doc.description?.trim() || '',
    memberCount: Number(doc.memberCount ?? doc.joined ?? 0) || 0,
    category,
    imageUrl: doc.profileImage || doc.coverImage,
    joined: Boolean(doc.isMember) || joinedIds.has(id),
    source: 'live',
  };
}

export async function bootstrapLiveSession(ctx: HttpContext): Promise<SessionUser> {
  const login = await request<SendResponse<LoginInfo>>(ctx, endpoints.userLogin);
  const info = login.info;
  if (!info?.email) throw new Error('The login response did not include a user.');

  const active = await request<SendResponse<{ roles?: ActiveRole[] }>>(ctx, endpoints.portfolioActive);
  const roles = active.info?.roles ?? [];
  const ambassador = roles.find((role) => role.name === EXTERNAL_AMBASSADOR_ROLE && role.active !== false);
  if (!ambassador?.name) {
    throw new Error('This account does not have an active external ambassador role.');
  }

  const portfolio = await request<SendResponse<PortfolioSession>>(ctx, endpoints.portfolioLogin, {
    method: 'POST',
    body: { rolename: ambassador.name },
    retry: false,
  });
  const refId = portfolio.info?._id?.trim();
  if (!refId) throw new Error('The portfolio session did not include a refId.');

  const firstName = info.firstName?.trim() || '';
  const lastName = info.lastName?.trim() || '';
  const name = info.name?.trim() || `${firstName} ${lastName}`.trim() || info.email;

  return {
    id: info.userId || info._id || info.email,
    email: info.email,
    name,
    firstName,
    lastName,
    picture: info.picture,
    roleName: ambassador.name,
    roleLabel: ambassador.displayName || 'External Ambassador',
    refId,
    source: 'live',
  };
}

export async function logoutLive(ctx: HttpContext, refreshToken: string): Promise<void> {
  await request(ctx, endpoints.userLogout, {
    method: 'POST',
    headers: { 'refresh-token': refreshToken },
    retry: false,
  });
}

export async function fetchProfile(ctx: HttpContext): Promise<Partial<SessionUser>> {
  const res = await dedupe('profile', () => request<SendResponse<Record<string, unknown>>>(ctx, endpoints.profile));
  const info = res.info ?? {};
  const firstName = typeof info.firstName === 'string' ? info.firstName : undefined;
  const lastName = typeof info.lastName === 'string' ? info.lastName : undefined;
  const email = typeof info.email === 'string' ? info.email : undefined;
  const picture = typeof info.photo === 'string' ? info.photo : undefined;
  return { firstName, lastName, email, picture };
}

function emptyPage<T>(page: number, pageSize: number): Page<T> {
  return { docs: [], totalDocs: 0, limit: pageSize, page, totalPages: 0, hasNextPage: false, hasPrevPage: page > 1 };
}

export async function fetchJoinedIds(ctx: HttpContext): Promise<Set<string>> {
  const res = await request<SendResponse<Page<JoinedDoc>>>(ctx, endpoints.communityJoined, {
    query: { pageIndex: 1, pageSize: 100 },
  });
  const ids = new Set<string>();
  for (const doc of res.info?.docs ?? []) {
    const id = doc.communityId || doc.community?._id || doc._id;
    if (id) ids.add(id);
  }
  return ids;
}

export async function fetchCommunities(
  ctx: HttpContext,
  query: { page: number; pageSize: number; search: string },
  signal?: AbortSignal,
): Promise<Page<Community>> {
  const key = `communities:${query.page}:${query.pageSize}:${query.search}`;
  const [list, joinedIds] = await Promise.all([
    dedupe(key, () =>
      request<SendResponse<Page<CommunityDoc>>>(ctx, endpoints.communityList, {
        method: 'POST',
        query: { pageIndex: query.page, pageSize: query.pageSize },
        body: query.search ? { searchText: query.search } : {},
        signal,
        retry: false,
      }),
    ),
    fetchJoinedIds(ctx).catch(() => new Set<string>()),
  ]);

  const info = list.info;
  const docs = (info?.docs ?? [])
    .map((doc) => mapCommunity(doc, joinedIds))
    .filter((doc): doc is Community => Boolean(doc));

  return {
    docs,
    totalDocs: info?.totalDocs ?? docs.length,
    limit: info?.limit ?? query.pageSize,
    page: info?.page ?? query.page,
    totalPages: info?.totalPages ?? 1,
    hasNextPage: Boolean(info?.hasNextPage),
    hasPrevPage: Boolean(info?.hasPrevPage),
  };
}

export async function fetchCommunity(ctx: HttpContext, id: string, signal?: AbortSignal): Promise<Community> {
  const [detail, joinedIds] = await Promise.all([
    request<SendResponse<CommunityDoc>>(ctx, `${endpoints.community}/${encodeURIComponent(id)}`, { signal }),
    fetchJoinedIds(ctx).catch(() => new Set<string>()),
  ]);
  const mapped = detail.info ? mapCommunity(detail.info, joinedIds) : null;
  if (!mapped) throw new Error('Community not found');
  return mapped;
}

export async function joinCommunity(ctx: HttpContext, communityId: string): Promise<void> {
  await request(ctx, endpoints.communityJoin, {
    method: 'POST',
    body: { communityId },
    retry: false,
  });
}

export async function leaveCommunity(ctx: HttpContext, communityId: string): Promise<void> {
  await request(ctx, endpoints.communityExit, {
    method: 'POST',
    body: { communityId },
    retry: false,
  });
}

export { emptyPage };
