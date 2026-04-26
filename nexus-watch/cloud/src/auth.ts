import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { z } from "zod";
import { ENV } from "./env";

export type JwtPayload = {
  sub: string;
  role: "admin";
};

export function signAdminJwt(username: string) {
  const payload: JwtPayload = { sub: username, role: "admin" };
  return jwt.sign(payload, ENV.jwtSecret, { expiresIn: "30d" });
}

export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, ENV.jwtSecret);
  const schema = z.object({ sub: z.string(), role: z.literal("admin") });
  return schema.parse(decoded);
}

export function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

