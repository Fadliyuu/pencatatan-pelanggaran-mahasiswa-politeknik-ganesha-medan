import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      message: 'Logout berhasil',
    });

    // Hapus cookie token
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat logout' },
      { status: 500 }
    );
  }
} 