import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Spotify integration not implemented. Use CSV/Forms data.'
  }, { status: 501 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Spotify integration not implemented. Use CSV/Forms data.'
  }, { status: 501 });
}
