import { NextRequest, NextResponse } from 'next/server';
import { initBackendDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { paymentId } = await params;
    
    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: 'Payment ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { paymentStatus, paidDate, remarks } = body;

    if (!paymentStatus || !['pending', 'paid'].includes(paymentStatus)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment status' },
        { status: 400 }
      );
    }

    const backendDb = await initBackendDatabase();
    const adminId = auth.user!.id;

    const updateFields = ['paymentStatus = ?'];
    const updateValues: any[] = [paymentStatus];

    if (paymentStatus === 'paid') {
      updateFields.push('paidDate = ?', 'paidBy = ?');
      updateValues.push(paidDate ? new Date(paidDate) : new Date(), adminId);
    }

    if (remarks !== undefined) {
      updateFields.push('remarks = ?');
      updateValues.push(remarks);
    }

    updateValues.push(paymentId);

    await (backendDb as any).execute(
      `UPDATE tbl_MechanicPayment 
       SET ${updateFields.join(', ')}
       WHERE paymentId = ?`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
    });
  } catch (error: any) {
    console.error('Update payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update payment', error: error.message },
      { status: 500 }
    );
  }
}

