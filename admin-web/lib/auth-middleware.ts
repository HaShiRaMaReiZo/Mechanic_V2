import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { initDatabase } from './db';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

export async function verifyAuth(request: NextRequest): Promise<{ user: AuthUser | null; error: NextResponse | null }> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        ),
      };
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as any;

    // Verify user exists and is admin
    const db = await initDatabase();
    const [users] = await db.execute(
      'SELECT id, username, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 401 }
        ),
      };
    }

    const user = users[0] as any;

    if (!user.is_active) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, message: 'Account is deactivated' },
          { status: 403 }
        ),
      };
    }

    if (user.role !== 'admin') {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, message: 'Admin access required' },
          { status: 403 }
        ),
      };
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      error: null,
    };
  } catch (error: any) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      ),
    };
  }
}

