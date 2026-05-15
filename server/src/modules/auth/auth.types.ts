export type AuthRole = 'USER' | 'DISPATCHER' | 'ADMIN';

export type JwtPayload = {
  sub: string;
  role: AuthRole;
};
