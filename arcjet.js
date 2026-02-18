import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode =
  process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) {
  throw new Error(
    "Arcjet environment variable ARCJET_KEY is not set. Please set it in your .env file."
  );
}

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: "10s",
          max: 50,
        }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: "2s",
          max: 5,
        }),
      ],
    })
  : null;

/**
 * Create an Express-compatible middleware that applies Arcjet HTTP protections to incoming requests.
 *
 * The middleware skips protection when the module-wide `httpArcjet` is not configured. When protection is applied,
 * a denied decision yields an immediate JSON response: `429` with `{ error: "Too Many Requests" }` for rate limits,
 * or `403` with `{ error: "Forbidden" }` for other denials. If an error occurs during protection, the middleware
 * responds with `503` and `{ error: "Service Unavailable" }`. If the request is allowed, it calls `next()`.
 *
 * @returns {Function} An Express-style middleware function `(req, res, next)`.
 */
export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) return next();

    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too Many Requests" });
        }

        return res.status(403).json({ error: "Forbidden" });
      }
    } catch (error) {
      console.error("Arcjet Middleware Error:", error);
      return res.status(503).json({ error: "Service Unavailable" });
    }

    next();
  };
}