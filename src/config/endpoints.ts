/** Paths match the existing INTOTO API. The origin comes from VITE_API_BASE_URL. */
export const endpoints = {
  tenantResolve: '/auth/tenant/resolve',
  userLogin: '/api/user/login',
  userLogout: '/api/user/logout',
  portfolioActive: '/api/portfolio/active',
  portfolioLogin: '/api/portfolio',
  profile: '/api/user-profile/profile',
  communityList: '/api/community/list',
  community: '/api/community',
  communityJoined: '/api/community/member/joined',
  communityJoin: '/api/community/member/join',
  communityExit: '/api/community/member/exit',
  homeAmbassadors: '/api/home/ambassadors',
} as const;

export const EXTERNAL_AMBASSADOR_ROLE = 'external_ambassador';
