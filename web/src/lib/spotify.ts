type TokenResponse = { access_token: string; token_type: string; expires_in: number }

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5000) return cachedToken.token
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: body.toString(),
  })
  if (!resp.ok) return null
  const data = (await resp.json()) as TokenResponse
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
  return cachedToken.token
}

export type AudioFeatures = {
  energy: number
  valence: number
  danceability: number
  tempo: number
}

export async function fetchAudioFeaturesFor(song: string, artist?: string): Promise<AudioFeatures | null> {
  const token = await getAccessToken()
  if (!token) return null
  const q = artist ? `track:${song} artist:${artist}` : song
  const encoded = encodeURIComponent(q)
  const searchUrl = `https://api.spotify.com/v1/search?q=${encoded}&type=track&limit=1`
  const headers = { Authorization: `Bearer ${token}` }
  const sresp = await fetch(searchUrl, { headers })
  if (!sresp.ok) return null
  const sdata = await sresp.json() as any
  const id = sdata?.tracks?.items?.[0]?.id
  if (!id) return null
  const featuresUrl = `https://api.spotify.com/v1/audio-features/${id}`
  const fresp = await fetch(featuresUrl, { headers })
  if (!fresp.ok) return null
  const fdata = await fresp.json() as any
  return {
    energy: Number(fdata.energy ?? NaN),
    valence: Number(fdata.valence ?? NaN),
    danceability: Number(fdata.danceability ?? NaN),
    tempo: Number(fdata.tempo ?? NaN),
  }
}

