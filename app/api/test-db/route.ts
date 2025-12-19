import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET() {
  const isConnected = await testConnection();
  
  if (isConnected) {
    return NextResponse.json({ 
      success: true,
      message: '✅ Database connected successfully!' 
    });
  } else {
    return NextResponse.json({ 
      success: false,
      error: '❌ Database connection failed' 
    }, { status: 500 });
  }
}