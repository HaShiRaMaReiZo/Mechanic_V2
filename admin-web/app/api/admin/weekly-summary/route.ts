import { NextRequest, NextResponse } from 'next/server';
import { initBackendDatabase, initDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

// Helper function to format date as YYYY-MM-DD in local time
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get week boundaries (Monday to Sunday)
const getWeekBoundaries = (date = new Date()) => {
  // Create a new date and set to noon to avoid timezone issues
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Monday
  // Monday (1) -> 0 days back
  // Tuesday (2) -> 1 day back
  // ...
  // Sunday (0) -> 6 days back
  const daysToMonday = day === 0 ? 6 : day - 1;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    weekStart: formatLocalDate(monday),
    weekEnd: formatLocalDate(sunday),
  };
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const backendDb = await initBackendDatabase();
    const adminDb = await initDatabase();
    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get('weekStartDate');
    const userId = searchParams.get('userId');
    
    let weekBounds;
    if (weekStartDate) {
      weekBounds = getWeekBoundaries(new Date(weekStartDate));
    } else {
      weekBounds = getWeekBoundaries();
    }
    
    let query = `
      SELECT 
        mp.paymentId,
        mp.userId,
        mp.weekStartDate,
        mp.weekEndDate,
        mp.totalAmount,
        mp.serviceCount,
        mp.paymentStatus,
        mp.paidDate,
        mp.remarks
      FROM tbl_MechanicPayment mp
      WHERE mp.weekStartDate = ?
    `;
    
    const params: any[] = [weekBounds.weekStart];
    
    if (userId) {
      query += ' AND mp.userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY mp.weekStartDate DESC';
    
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
      data: formattedPayments,
    });
  } catch (error: any) {
    console.error('Get weekly summary error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch weekly summary', error: error.message },
      { status: 500 }
    );
  }
}

