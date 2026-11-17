import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/config/env';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'collabify-growth',
    supabaseConfigured: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
}

