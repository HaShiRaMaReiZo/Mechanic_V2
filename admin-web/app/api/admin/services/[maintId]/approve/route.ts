import { NextRequest, NextResponse } from 'next/server';
import { initBackendDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { maintId: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { maintId } = params;
    const db = await initBackendDatabase();
    const adminId = auth.user!.id;
    
    await (db as any).execute(
      `UPDATE tbl_AssetMaintenance 
       SET reviewStatus = 'approved',
           reviewedBy = ?,
           reviewedAt = NOW()
       WHERE maintId = ?`,
      [adminId, maintId]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Service approved successfully',
    });
  } catch (error: any) {
    console.error('Approve service error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to approve service', error: error.message },
      { status: 500 }
    );
  }
}

