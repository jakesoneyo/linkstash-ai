// AuthService.login에서 서명하는 JWT payload 형태. sub = User.id.
export interface JwtPayload {
  sub: string;
  email: string;
}

// JwtStrategy.validate()가 반환해 req.user에 주입되는 요청 컨텍스트 유저.
export interface AuthenticatedUser {
  id: string;
  email: string;
}
