// Utility for Google Calendar API requests with queue throttling and exponential backoff retry

interface GcalQueueItem {
  url: string;
  options: RequestInit;
  resolve: (res: Response) => void;
  reject: (err: any) => void;
  retriesLeft: number;
  initialDelayMs: number;
}

class GcalRequestQueue {
  private queue: GcalQueueItem[] = [];
  private isProcessing = false;
  private minIntervalMs = 200; // 200ms between requests ensures <= 5 req/sec (well within quota)
  private lastRequestTime = 0;

  public async fetch(url: string, options: RequestInit, maxRetries: number = 4): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        url,
        options,
        resolve,
        reject,
        retriesLeft: maxRetries,
        initialDelayMs: 1000
      });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;

    const item = this.queue.shift()!;
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < this.minIntervalMs) {
      await new Promise(r => setTimeout(r, this.minIntervalMs - timeSinceLast));
    }

    try {
      this.lastRequestTime = Date.now();
      const response = await fetch(item.url, item.options);

      // Check if response is a transient rate limit or server error
      if (this.isRateLimitOrServerError(response.status)) {
        // Clone response to inspect body for rateLimitExceeded
        const clone = response.clone();
        let isRateLimit = response.status === 429 || (response.status >= 500 && response.status <= 504);
        let errorDetails = "";

        if (response.status === 403) {
          try {
            const txt = await clone.text();
            errorDetails = txt;
            if (
              txt.includes("rateLimitExceeded") ||
              txt.includes("userRateLimitExceeded") ||
              txt.includes("usageLimits") ||
              txt.includes("Rate Limit Exceeded") ||
              txt.includes("quotaExceeded")
            ) {
              isRateLimit = true;
            }
          } catch (_) {
            isRateLimit = true;
          }
        }

        if (isRateLimit && item.retriesLeft > 0) {
          // Calculate exponential backoff delay with randomized jitter
          const attempt = 4 - item.retriesLeft;
          const backoff = Math.min(16000, item.initialDelayMs * Math.pow(2, attempt)) + Math.floor(Math.random() * 600);
          console.warn(`[GCal Rate Limiter] Rate limit or server error (Status: ${response.status}). Retrying in ${backoff}ms (${item.retriesLeft} retries remaining)...`);

          await new Promise(r => setTimeout(r, backoff));
          
          // Re-insert at the FRONT of the queue to retry immediately after backoff
          this.queue.unshift({
            ...item,
            retriesLeft: item.retriesLeft - 1
          });
          this.isProcessing = false;
          this.processNext();
          return;
        }
      }

      item.resolve(response);
    } catch (err: any) {
      if (item.retriesLeft > 0) {
        const attempt = 4 - item.retriesLeft;
        const backoff = Math.min(16000, item.initialDelayMs * Math.pow(2, attempt)) + Math.floor(Math.random() * 600);
        console.warn(`[GCal Rate Limiter] Network failure, retrying in ${backoff}ms (${item.retriesLeft} retries left):`, err);
        await new Promise(r => setTimeout(r, backoff));
        this.queue.unshift({
          ...item,
          retriesLeft: item.retriesLeft - 1
        });
      } else {
        item.reject(err);
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), this.minIntervalMs);
      }
    }
  }

  private isRateLimitOrServerError(status: number): boolean {
    return status === 403 || status === 429 || (status >= 500 && status <= 504);
  }
}

export const gcalFetchQueue = new GcalRequestQueue();
