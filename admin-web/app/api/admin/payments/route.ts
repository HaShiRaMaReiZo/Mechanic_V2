import { NextRequest, NextResponse } from 'next/server';
import { initBackendDatabase, initDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const backendDb = await initBackendDatabase();
    const adminDb = await initDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let query = `
      SELECT 
        mp.*
      FROM tbl_MechanicPayment mp
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ' AND mp.paymentStatus = ?';
      params.push(status);
    }
    
    if (userId) {
      query += ' AND mp.userId = ?';
      params.push(userId);
    }
    
    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await (backendDb as any).execute(countQuery, params) as any[];
    const total = countResult[0].total;
    
    // Add pagination
    query += ' ORDER BY mp.weekStartDate DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const [payments] = await (backendDb as any).execute(query, params) as any[];
    
    // Get user info from admin-web database
    const userIds = [...new Set(payments.map((p: any) => p.userId))];
    const userMap = new Map();
    
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const [users] = await (adminDb as any).execute(
        `SELECT id, username, first_name, last_name, email FROM users WHERE id IN (${placeholders})`,
        userIds
      ) as any[];
      
      users.forEach((u: any) => {
        userMap.set(u.id, u);
      });
    }
    
    const formattedPayments = payments.map((p: any) => {
      const user = userMap.get(p.userId);
      return {
        ...p,
        totalAmount: parseFloat(p.totalAmount) || 0,
        username: user?.username || `User ID: ${p.userId}`,
        first_name: user?.first_name || null,
        last_name: user?.last_name || null,
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        payments: formattedPayments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments', error: error.message },
      { status: 500 }
    );
  }
}


