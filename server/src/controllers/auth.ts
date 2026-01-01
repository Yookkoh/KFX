import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../utils/jwt.js';
import type { RegisterInput, LoginInput } from '../validators/index.js';

const SALT_ROUNDS = 12;

/**
 * Register new user with email/password
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body as RegisterInput;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        provider: 'EMAIL',
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    
    // Generate tokens
    const tokens = await generateTokenPair(user.id, user.email);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}

/**
 * Login with email/password
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }
    
    // Generate tokens
    const tokens = await generateTokenPair(user.id, user.email);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (!token) {
      res.status(401).json({ success: false, error: 'Refresh token required' });
      return;
    }
    
    // Verify refresh token
    const userId = await verifyRefreshToken(token);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    
    // Revoke old refresh token
    await revokeRefreshToken(token);
    
    // Generate new tokens
    const tokens = await generateTokenPair(user.id, user.email);
    
    // Set new refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
}

/**
 * Logout - revoke refresh token
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    
    if (token) {
      await revokeRefreshToken(token);
    }
    
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
}

/**
 * Logout from all devices
 */
export async function logoutAll(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    
    await revokeAllUserTokens(req.user.id);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
        createdAt: true,
        workspaceMembers: {
          include: {
            workspace: {
              include: {
                settings: true,
              },
            },
          },
        },
      },
    });
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
}

/**
 * Check if user has completed onboarding
 */
export async function checkOnboarding(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: { userId: req.user.id },
      include: { workspace: true },
    });
    
    res.json({
      success: true,
      data: {
        hasWorkspace: !!workspaceMember,
        workspace: workspaceMember?.workspace || null,
      },
    });
  } catch (error) {
    console.error('Check onboarding error:', error);
    res.status(500).json({ success: false, error: 'Failed to check onboarding' });
  }
}
