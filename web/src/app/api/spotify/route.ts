import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Spotify integration not implemented. Use CSV/Forms data.'
  }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Spotify integration not implemented. Use CSV/Forms data.'
  }, { status: 501 });
}
