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
    const body = await request.json();
    const { reviewNotes } = body;
    const db = await initBackendDatabase();
    const adminId = auth.user!.id;
    
    await (db as any).execute(
      `UPDATE tbl_AssetMaintenance 
       SET reviewStatus = 'rejected',
           reviewedBy = ?,
           reviewedAt = NOW(),
           reviewNotes = ?
       WHERE maintId = ?`,
      [adminId, reviewNotes || null, maintId]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Service rejected successfully',
    });
  } catch (error: any) {
    console.error('Reject service error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reject service', error: error.message },
      { status: 500 }
    );
  }
}

