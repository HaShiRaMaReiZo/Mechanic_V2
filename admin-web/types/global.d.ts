/// <reference types="node" />

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    userId?: number;
    username?: string;
    role?: string;
    [key: string]: any;
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string,
    options?: any
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string
  ): JwtPayload;
}

