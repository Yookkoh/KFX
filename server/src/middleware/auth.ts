import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { verifyAccessToken } from '../utils/jwt.js';
import type { AuthUser } from '../types/index.js';

/**
 * Authenticate user via JWT token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.cookies?.accessToken;
    
    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    
    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true },
    });
    
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    
    req.user = user as AuthUser;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

/**
 * Require workspace access
 * Must be used after authenticate middleware
 */
export async function requireWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    
    // Get workspace ID from params or query
    const workspaceId = req.params.workspaceId || req.query.workspaceId as string;
    
    if (!workspaceId) {
      res.status(400).json({ success: false, error: 'Workspace ID required' });
      return;
    }
    
    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId,
        },
      },
      include: {
        workspace: true,
      },
    });
    
    if (!membership) {
      res.status(403).json({ success: false, error: 'Access denied to this workspace' });
      return;
    }
    
    req.workspace = membership.workspace;
    req.workspaceMember = membership;
    next();
  } catch (error) {
    console.error('Workspace middleware error:', error);
    res.status(500).json({ success: false, error: 'Authorization error' });
  }
}

/**
 * Require admin or owner role in workspace
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.workspaceMember) {
      res.status(403).json({ success: false, error: 'Workspace access required' });
      return;
    }
    
    if (!roles.includes(req.workspaceMember.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

/**
 * Optional authentication (for public routes that can benefit from auth)
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.cookies?.accessToken;
    
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, name: true },
        });
        if (user) {
          req.user = user as AuthUser;
        }
      }
    }
    
    next();
  } catch {
    // Continue without auth
    next();
  }
}
