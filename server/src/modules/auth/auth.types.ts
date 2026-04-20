export type AuthRole = 'USER' | 'DRIVER' | 'ADMIN';

export type JwtPayload = {
  sub: string;
  role: AuthRole;
};

