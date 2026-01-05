import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const db = await initDatabase();
    const [users] = await (db as any).execute(
      'SELECT id, username, password, email, first_name, last_name, role, is_active FROM users WHERE username = ?',
      [username]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const user = users[0] as any;

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Generate JWT token
    // @ts-ignore - process.env is available in Node.js runtime
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    // @ts-ignore
    const jwtExpire = process.env.JWT_EXPIRE || '7d';
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpire }
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed', error: error.message },
      { status: 500 }
    );
  }
}

