import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const db = await initDatabase();
    
    const [users] = await (db as any).execute(
      `SELECT id, username, first_name, last_name, email, role, is_active
       FROM users
       WHERE role = 'mechanic' AND is_active = 1
       ORDER BY username`
    ) as any[];
    
    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users', error: error.message },
      { status: 500 }
    );
  }
}

