import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import prisma from '../config/database.js';
import type { JwtPayload, TokenPair } from '../types/index.js';

// Parse duration string to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // default 15 minutes
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + parseDuration(config.refreshTokenExpiresIn));
  
  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
  
  return token;
}

export async function generateTokenPair(userId: string, email: string): Promise<TokenPair> {
  const accessToken = generateAccessToken({ userId, email });
  const refreshToken = await generateRefreshToken(userId);
  
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
  });
  
  if (!refreshToken || refreshToken.expiresAt < new Date()) {
    // Clean up expired token
    if (refreshToken) {
      await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
    }
    return null;
  }
  
  return refreshToken.userId;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

// Cleanup expired tokens (call periodically)
export async function cleanupExpiredTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
