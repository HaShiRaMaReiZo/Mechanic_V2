import { NextRequest, NextResponse } from 'next/server';
import { initBackendDatabase, initDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const db = await initBackendDatabase();
    const adminDb = await initDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let query = `
      SELECT 
        am.maintId,
        am.maintenanceCode,
        am.mileage,
        am.actualMaintCost,
        am.dateImplemented,
        am.engineOilRefilled,
        am.engineOilCost,
        am.chainTightened,
        am.chainTightenedCost,
        am.chainSprocketChanged,
        am.chainSprocketChangedCost,
        am.otherMaintServices,
        am.otherMaintServicesCost,
        am.maintCurrentReport,
        am.reviewStatus,
        am.reviewedBy,
        am.reviewedAt,
        am.reviewNotes,
        am.personImplemented
      FROM tbl_AssetMaintenance am
      WHERE am.dateImplemented IS NOT NULL AND am.dtDeleted IS NULL
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ' AND am.reviewStatus = ?';
      params.push(status);
    }
    
    if (userId) {
      // Get mainDbUserId from admin-web database
      const [adminUsers] = await (adminDb as any).execute(
        'SELECT mainDbUserId FROM users WHERE id = ?',
        [userId]
      ) as any[];
      
      if (adminUsers.length > 0 && adminUsers[0].mainDbUserId) {
        query += ' AND am.personImplemented = ?';
        params.push(adminUsers[0].mainDbUserId);
      } else {
        // If no mainDbUserId found, return empty result
        query += ' AND 1=0';
      }
    }
    
    if (startDate) {
      query += ' AND DATE(am.dateImplemented) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(am.dateImplemented) <= ?';
      params.push(endDate);
    }
    
    if (search) {
      query += ' AND (am.maintenanceCode LIKE ? OR am.maintId = ?)';
      params.push(`%${search}%`, search);
    }
    
    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await (db as any).execute(countQuery, params) as any[];
    const total = countResult[0].total;
    
    // Add pagination
    query += ' ORDER BY am.dateImplemented DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const [services] = await (db as any).execute(query, params) as any[];
    
    // Format services
    const formattedServices = services.map((service: any) => ({
      ...service,
      imageUrl: service.maintCurrentReport 
        ? `/api/uploads/${service.maintCurrentReport.replace(/^uploads[\\/]/, '')}`
        : null,
      actualMaintCost: parseFloat(service.actualMaintCost) || 0,
      engineOilCost: parseFloat(service.engineOilCost) || 0,
      chainTightenedCost: parseFloat(service.chainTightenedCost) || 0,
      chainSprocketChangedCost: parseFloat(service.chainSprocketChangedCost) || 0,
      otherMaintServicesCost: parseFloat(service.otherMaintServicesCost) || 0,
      mechanicName: service.personImplemented ? `User ID: ${service.personImplemented}` : 'N/A',
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        services: formattedServices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get services error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch services', error: error.message },
      { status: 500 }
    );
  }
}

