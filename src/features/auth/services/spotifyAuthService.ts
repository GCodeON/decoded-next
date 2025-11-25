const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export type TokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

async function postTokenForm(params: URLSearchParams): Promise<TokenResponse> {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify client credentials');
  }

  const authHeader = `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`;

  const resp = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: authHeader,
    },
    body: params.toString(),
  });

  const text = await resp.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    // if parse fails, keep data as empty object
  }

  if (!resp.ok) {
    throw new Error(data.error_description || data.error || `Token request failed: ${resp.status}`);
  }

  return data as TokenResponse;
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  return postTokenForm(params);
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return postTokenForm(params);
}

export const spotifyAuthService = {
  exchangeCodeForTokens,
  refreshAccessToken,
};
