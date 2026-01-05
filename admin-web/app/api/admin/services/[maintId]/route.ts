import { NextRequest, NextResponse } from 'next/server';
import { initBackendDatabase, initDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { maintId: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { maintId } = params;
    const db = await initBackendDatabase();
    const adminDb = await initDatabase();
    
    const [services] = await (db as any).execute(
      `SELECT * FROM tbl_AssetMaintenance WHERE maintId = ? AND dtDeleted IS NULL`,
      [maintId]
    ) as any[];
    
    if (services.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Service not found' },
        { status: 404 }
      );
    }
    
    const service = services[0];
    
    // Get mechanic info if personImplemented exists
    let mechanicInfo = null;
    if (service.personImplemented) {
      const [mechanics] = await (adminDb as any).execute(
        `SELECT id, username, first_name, last_name, email, mainDbUserId 
         FROM users 
         WHERE mainDbUserId = ? 
         LIMIT 1`,
        [service.personImplemented]
      ) as any[];
      
      if (mechanics.length > 0) {
        mechanicInfo = mechanics[0];
      }
    }
    
    service.imageUrl = service.maintCurrentReport 
      ? `/api/uploads/${service.maintCurrentReport.replace(/^uploads[\\/]/, '')}`
      : null;
    
    service.mechanicName = mechanicInfo ? mechanicInfo.username : `User ID: ${service.personImplemented || 'N/A'}`;
    
    return NextResponse.json({
      success: true,
      data: {
        ...service,
        mechanic: mechanicInfo,
      },
    });
  } catch (error: any) {
    console.error('Get service details error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch service details', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { maintId: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { maintId } = params;
    const body = await request.json();
    const db = await initBackendDatabase();
    
    const {
      mileage,
      actualMaintCost,
      engineOilRefilled,
      engineOilCost,
      chainTightened,
      chainTightenedCost,
      chainSprocketChanged,
      chainSprocketChangedCost,
      otherMaintServices,
      otherMaintServicesCost,
    } = body;
    
    const updateFields = [];
    const updateValues: any[] = [];
    
    if (mileage !== undefined) {
      updateFields.push('mileage = ?');
      updateValues.push(mileage);
    }
    if (actualMaintCost !== undefined) {
      updateFields.push('actualMaintCost = ?');
      updateValues.push(actualMaintCost);
    }
    if (engineOilRefilled !== undefined) {
      updateFields.push('engineOilRefilled = ?');
      updateValues.push(engineOilRefilled ? 1 : 0);
    }
    if (engineOilCost !== undefined) {
      updateFields.push('engineOilCost = ?');
      updateValues.push(engineOilCost);
    }
    if (chainTightened !== undefined) {
      updateFields.push('chainTightened = ?');
      updateValues.push(chainTightened ? 1 : 0);
    }
    if (chainTightenedCost !== undefined) {
      updateFields.push('chainTightenedCost = ?');
      updateValues.push(chainTightenedCost);
    }
    if (chainSprocketChanged !== undefined) {
      updateFields.push('chainSprocketChanged = ?');
      updateValues.push(chainSprocketChanged ? 1 : 0);
    }
    if (chainSprocketChangedCost !== undefined) {
      updateFields.push('chainSprocketChangedCost = ?');
      updateValues.push(chainSprocketChangedCost);
    }
    if (otherMaintServices !== undefined) {
      updateFields.push('otherMaintServices = ?');
      updateValues.push(otherMaintServices);
    }
    if (otherMaintServicesCost !== undefined) {
      updateFields.push('otherMaintServicesCost = ?');
      updateValues.push(otherMaintServicesCost);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No fields to update' },
        { status: 400 }
      );
    }
    
    updateFields.push('dtUpdated = NOW()');
    updateValues.push(maintId);
    
    await (db as any).execute(
      `UPDATE tbl_AssetMaintenance 
       SET ${updateFields.join(', ')}
       WHERE maintId = ?`,
      updateValues
    );
    
    return NextResponse.json({
      success: true,
      message: 'Service updated successfully',
    });
  } catch (error: any) {
    console.error('Update service error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update service', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
       SET dtDeleted = NOW(),
           personDeleted = ?
       WHERE maintId = ?`,
      [adminId, maintId]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete service error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete service', error: error.message },
      { status: 500 }
    );
  }
}

