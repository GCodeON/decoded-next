import { LrcLib } from '@/lib/lrclib/client';
import { solvePow } from '@/lib/lrclib/pow';
import type { LrcLibData, LyricsSearchParams, GetLyricsResult, PublishPayload, PublishResult, ChallengeData } from '@/modules/lyrics';

export class LyricsService {
  private readonly challengeTimeout = 8000;
  private readonly publishTimeout = 10000;
  private readonly userAgent = 'DecodedNext/1.0 (+https://github.com/GCodeON/decoded-next)';

  async getLyrics(params: LyricsSearchParams): Promise<GetLyricsResult> {
    try {
      const url = LrcLib.get({
        artist: params.artistName,
        track: params.trackName,
        album: params.albumName,
        duration: params.duration,
      });

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });

      if (response.status === 404) {
        return { success: false, error: 'not_found' };
      }

      if (!response.ok) {
        return {
          success: false,
          error: 'invalid_response',
          details: { status: response.status, statusText: response.statusText },
        };
      }

      const data: LrcLibData = await response.json();
      return { success: true, data };
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return { success: false, error: 'timeout' };
      }
      return { success: false, error: 'invalid_response', details: err };
    }
  }

  /**
   * Publish lyrics to LrcLib with proof-of-work
   * This is a blocking operation that can take up to ~15 seconds
   */
  async publishWithPow(
    payload: PublishPayload,
    options?: { logPrefix?: string }
  ): Promise<PublishResult> {
    const logPrefix = options?.logPrefix || `[LrcLib:${payload.artistName}-${payload.trackName}]`;

    try {
      console.log(`${logPrefix} Starting publish with PoW`);

      // Step 1: Request challenge
      console.log(`${logPrefix} Requesting challenge`);
      const challengeResult = await this.requestChallenge();
      if (!challengeResult.success) {
        console.error(`${logPrefix} Challenge failed:`, challengeResult.details);
        return {
          success: false,
          error: 'challenge_failed',
          details: challengeResult.details,
        };
      }

      const { prefix, target } = challengeResult.data;
      console.log(`${logPrefix} Challenge received: prefix=${prefix.slice(0, 8)}...`);

      // Step 2: Solve PoW
      console.log(`${logPrefix} Solving PoW`);
      const powResult = await solvePow(prefix, target);
      if (!powResult) {
        console.error(`${logPrefix} PoW timeout after 15s`);
        return {
          success: false,
          error: 'pow_timeout',
        };
      }
      console.log(`${logPrefix} PoW solved in ${powResult.duration}ms`);

      // Step 3: Publish with token
      const token = `${prefix}:${powResult.nonce}`;
      const publishResult = await this.publish(payload, token);

      if (publishResult.success) {
        console.log(`${logPrefix} Successfully published`, { id: publishResult.id });
      } else {
        console.error(`${logPrefix} Publish failed:`, publishResult.details);
      }

      return publishResult;
    } catch (err: any) {
      console.error(`${logPrefix} Unexpected error:`, err?.message || err);
      return {
        success: false,
        error: 'publish_failed',
        details: { message: err?.message || 'Unknown error' },
      };
    }
  }

  /**
   * Request a proof-of-work challenge from LrcLib
   */
  private async requestChallenge(): Promise<
    | { success: true; data: ChallengeData }
    | { success: false; details: unknown }
  > {
    try {
      const response = await fetch(LrcLib.requestChallenge(), {
        method: 'POST',
        signal: (AbortSignal as any).timeout
          ? (AbortSignal as any).timeout(this.challengeTimeout)
          : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          details: { status: response.status, payload: text },
        };
      }

      const json = await response.json();
      const { prefix, target } = json;

      if (!prefix || !target) {
        return {
          success: false,
          details: { message: 'Missing prefix/target in challenge response' },
        };
      }

      return { success: true, data: { prefix, target } };
    } catch (err: any) {
      return {
        success: false,
        details: { message: err?.message || 'Challenge request failed' },
      };
    }
  }

  /**
   * Publish lyrics to LrcLib with a pre-computed PoW token
   */
  private async publish(
    payload: PublishPayload,
    token: string
  ): Promise<PublishResult> {
    try {
      const response = await fetch(LrcLib.publish(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Publish-Token': token,
          'User-Agent': this.userAgent,
        },
        body: JSON.stringify(payload),
        signal: (AbortSignal as any).timeout
          ? (AbortSignal as any).timeout(this.publishTimeout)
          : undefined,
      });

      const text = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? JSON.parse(text) : { message: text };

      if (!response.ok) {
        return {
          success: false,
          error: 'publish_failed',
          details: { status: response.status, payload: data },
        };
      }

      return {
        success: true,
        id: data?.id?.toString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'publish_failed',
        details: { message: err?.message || 'Publish request failed' },
      };
    }
  }
}

// Export singleton instance
export const lyricsService = new LyricsService();
