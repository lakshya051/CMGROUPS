import client from 'prom-client';

// Default Node.js process metrics (event loop lag, GC, heap, file descriptors, etc.).
// These are what most production incidents start with — "the heap is at 95%",
// "event loop lag is 4 s" — so collect them eagerly.
client.collectDefaultMetrics({ prefix: 'shoptify_' });

export const httpRequestDurationMs = new client.Histogram({
    name: 'shoptify_http_request_duration_ms',
    help: 'HTTP request duration in milliseconds, by route and status code',
    labelNames: ['method', 'route', 'status'],
    // Buckets tuned for an Express API: most healthy requests sub-100 ms,
    // rare slow path < 5 s, anything beyond is a 5xx in disguise.
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

export const httpRequestsTotal = new client.Counter({
    name: 'shoptify_http_requests_total',
    help: 'Total HTTP requests, by method and status',
    labelNames: ['method', 'route', 'status'],
});

export const cacheHitsTotal = new client.Counter({
    name: 'shoptify_cache_hits_total',
    help: 'Cache hits, by key and freshness (fresh|stale)',
    labelNames: ['key', 'freshness'],
});

export const cacheMissesTotal = new client.Counter({
    name: 'shoptify_cache_misses_total',
    help: 'Cache misses (cold-fill from DB)',
    labelNames: ['key'],
});

export const breakerStateChanges = new client.Counter({
    name: 'shoptify_db_breaker_state_changes_total',
    help: 'Number of times the DB circuit breaker has changed state',
    labelNames: ['state'],
});

export const dbBreakerOpen = new client.Gauge({
    name: 'shoptify_db_breaker_open',
    help: '1 if the DB circuit breaker is currently open, 0 otherwise',
});

export const slowQueriesTotal = new client.Counter({
    name: 'shoptify_db_slow_queries_total',
    help: 'Number of Prisma queries exceeding the slow-query threshold',
});

/** Express middleware: records duration + status of every request. Mount AFTER
 *  routes so the route path is available on `req.route`. */
export const httpMetricsMiddleware = (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationNs = Number(process.hrtime.bigint() - start);
        const durationMs = durationNs / 1_000_000;
        // Use the matched Express route pattern when available (`/api/products/:id`)
        // so we don't blow up cardinality with one bucket per id.
        const route = req.route?.path
            ? `${req.baseUrl || ''}${req.route.path}`
            : req.path.replace(/\/\d+(?=\/|$)/g, '/:id');
        const labels = {
            method: req.method,
            route,
            status: String(res.statusCode),
        };
        httpRequestDurationMs.observe(labels, durationMs);
        httpRequestsTotal.inc(labels);
    });
    next();
};

export const renderMetrics = async () => {
    return client.register.metrics();
};

export const metricsContentType = client.register.contentType;
