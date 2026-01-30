import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, updateUserRole } from '@/modules/auth/services/userService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    // Check if user is authenticated and is admin
    if (!userId || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify user is actually admin in Firestore
    const adminUser = await getUserById(userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Prevent admin from changing their own role
    if (userId === params.id) {
      return NextResponse.json(
        { error: 'Cannot modify your own role' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await getUserById(params.id);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user role
    await updateUserRole(params.id, role);

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
