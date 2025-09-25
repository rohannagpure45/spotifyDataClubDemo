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
  if (!resp.ok) {
    try { console.warn('Spotify token error:', resp.status, await resp.text()) } catch {}
    return null
  }
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

type SpotifySearchResponse = { tracks: { items: Array<{ id: string }> } }
type SpotifyAudioFeaturesWire = { id?: string; energy?: number; valence?: number; danceability?: number; tempo?: number }
type SpotifyAudioFeaturesBatchResponse = { audio_features: SpotifyAudioFeaturesWire[] }

function cleanTitle(s: string): string {
  return s
    .replace(/\(feat\.[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/-\s*(Remaster(ed)?(\s*\d{4})?|Live|Version|Single|Radio Edit)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchAudioFeaturesFor(song: string, artist?: string): Promise<AudioFeatures | null> {
  const token = await getAccessToken()
  if (!token) return null
  const title = cleanTitle(song)
  const artistClean = artist ? cleanTitle(artist) : undefined
  const queries = [
    artistClean ? `track:"${title}" artist:"${artistClean}"` : `track:"${title}"`,
    artistClean ? `${title} ${artistClean}` : title,
    title,
  ]
  const headers = { Authorization: `Bearer ${token}` }
  let id: string | undefined
  for (const q of queries) {
    const encoded = encodeURIComponent(q)
    const searchUrl = `https://api.spotify.com/v1/search?q=${encoded}&type=track&limit=1&market=US`
    const sresp = await fetch(searchUrl, { headers })
    if (!sresp.ok) continue
    const sdata = await sresp.json() as SpotifySearchResponse
    id = sdata.tracks?.items?.[0]?.id
    if (id) break
  }
  if (!id) return null
  const featuresUrl = `https://api.spotify.com/v1/audio-features/${id}`
  const fresp = await fetch(featuresUrl, { headers })
  if (!fresp.ok) return null
  const fdata = await fresp.json() as SpotifyAudioFeaturesWire
  return {
    energy: Number(fdata.energy ?? NaN),
    valence: Number(fdata.valence ?? NaN),
    danceability: Number(fdata.danceability ?? NaN),
    tempo: Number(fdata.tempo ?? NaN),
  }
}

export async function searchTrackId(song: string, artist?: string): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null
  const title = cleanTitle(song)
  const artistClean = artist ? cleanTitle(artist) : undefined
  const queries = [
    artistClean ? `track:"${title}" artist:"${artistClean}"` : `track:"${title}"`,
    artistClean ? `${title} ${artistClean}` : title,
    title,
  ]
  for (const q of queries) {
    const encoded = encodeURIComponent(q)
    const url = `https://api.spotify.com/v1/search?q=${encoded}&type=track&limit=1&market=US`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!resp.ok) continue
    const data = await resp.json() as SpotifySearchResponse
    const id = data.tracks?.items?.[0]?.id
    if (id) return id
  }
  return null
}

export async function fetchAudioFeaturesBatch(ids: string[]): Promise<Record<string, AudioFeatures>> {
  const token = await getAccessToken()
  const out: Record<string, AudioFeatures> = {}
  if (!token || ids.length === 0) return out
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100))
  for (const chunk of chunks) {
    const url = `https://api.spotify.com/v1/audio-features?ids=${chunk.join(',')}`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!resp.ok) continue
    const data = await resp.json() as SpotifyAudioFeaturesBatchResponse
    const feats = Array.isArray(data.audio_features) ? data.audio_features : []
    for (const f of feats) {
      if (!f || !f.id) continue
      out[f.id] = {
        energy: Number(f.energy ?? NaN),
        valence: Number(f.valence ?? NaN),
        danceability: Number(f.danceability ?? NaN),
        tempo: Number(f.tempo ?? NaN),
      }
    }
  }
  return out
}
