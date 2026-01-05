import { NextRequest, NextResponse } from 'next/server';
import { initBackendDatabase } from '@/lib/db';
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

    const db = await initBackendDatabase();
    const weekBounds = getWeekBoundaries();
    
    // Pending reviews count
    const [pendingReviews] = await (db as any).execute(
      `SELECT COUNT(*) as count FROM tbl_AssetMaintenance 
       WHERE reviewStatus = 'pending' AND dateImplemented IS NOT NULL`
    ) as any[];
    
    // Total services this week
    const [weekServices] = await (db as any).execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(actualMaintCost), 0) as total 
       FROM tbl_AssetMaintenance 
       WHERE dateImplemented IS NOT NULL 
       AND DATE(dateImplemented) >= ? AND DATE(dateImplemented) <= ?`,
      [weekBounds.weekStart, weekBounds.weekEnd]
    ) as any[];
    
    // Total services all time
    const [allServices] = await (db as any).execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(actualMaintCost), 0) as total 
       FROM tbl_AssetMaintenance 
       WHERE dateImplemented IS NOT NULL`
    ) as any[];
    
    // Total pending payments
    const [pendingPayments] = await (db as any).execute(
      `SELECT COUNT(*) as count FROM tbl_MechanicPayment WHERE paymentStatus = 'pending'`
    ) as any[];
    
    const stats = {
      pendingReviews: (pendingReviews as any[])[0].count,
      weekServices: (weekServices as any[])[0].count,
      weekTotal: parseFloat((weekServices as any[])[0].total) || 0,
      allServices: (allServices as any[])[0].count,
      allTotal: parseFloat((allServices as any[])[0].total) || 0,
      pendingPayments: (pendingPayments as any[])[0].count,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch statistics', error: error.message },
      { status: 500 }
    );
  }
}

