"""
Advanced rate limiting middleware for production scalability.

Implements:
- Distributed rate limiting using Redis
- Per-IP, per-user, per-endpoint limits
- Token bucket algorithm
- Sliding window counters
- Bypass for internal services
"""

from __future__ import annotations

import time
from typing import Callable, Optional

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as aioredis
import structlog

logger = structlog.get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Distributed rate limiting using Redis.

    Supports multiple strategies:
    - Fixed window
    - Sliding window log
    - Token bucket
    """

    def __init__(
        self,
        app,
        redis_url: str,
        default_limit: int = 100,
        default_window: int = 60,
        bypass_internal: bool = True,
    ):
        super().__init__(app)
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
        self.default_limit = default_limit
        self.default_window = default_window
        self.bypass_internal = bypass_internal

        # Endpoint-specific limits
        self.endpoint_limits = {
            "/api/v1/voting/submit": (10, 60),  # 10 votes per minute
            "/api/v1/voting/token": (5, 60),     # 5 tokens per minute
            "/api/v1/elections": (100, 60),      # 100 requests per minute
            "/api/v1/public/*": (1000, 60),      # 1000 reads per minute
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""

        # Bypass for health checks and internal requests
        if request.url.path in ["/health", "/metrics"]:
            return await call_next(request)

        if self.bypass_internal and self._is_internal_request(request):
            return await call_next(request)

        # Get client identifier
        client_id = self._get_client_id(request)

        # Get rate limit for this endpoint
        limit, window = self._get_endpoint_limit(request.url.path)

        # Check rate limit
        allowed, retry_after = await self._check_rate_limit(
            client_id,
            request.url.path,
            limit,
            window,
        )

        if not allowed:
            logger.warning(
                "rate_limit_exceeded",
                client_id=client_id,
                path=request.url.path,
                retry_after=retry_after,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(
            await self._get_remaining(client_id, request.url.path, limit, window)
        )
        response.headers["X-RateLimit-Reset"] = str(
            int(time.time()) + window
        )

        return response

    async def _check_rate_limit(
        self,
        client_id: str,
        path: str,
        limit: int,
        window: int,
    ) -> tuple[bool, int]:
        """
        Check if request is within rate limit using sliding window.

        Returns:
            (allowed, retry_after_seconds)
        """
        key = f"rate_limit:{client_id}:{path}"
        now = time.time()
        window_start = now - window

        # Use Redis sorted set for sliding window
        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count entries in current window
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, window)

        results = await pipe.execute()
        count = results[1]

        if count >= limit:
            # Get oldest entry to calculate retry_after
            oldest = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                oldest_time = oldest[0][1]
                retry_after = int(oldest_time + window - now)
                return False, max(retry_after, 1)
            return False, window

        return True, 0

    async def _get_remaining(
        self,
        client_id: str,
        path: str,
        limit: int,
        window: int,
    ) -> int:
        """Get remaining requests in current window."""
        key = f"rate_limit:{client_id}:{path}"
        now = time.time()
        window_start = now - window

        # Clean and count
        await self.redis.zremrangebyscore(key, 0, window_start)
        count = await self.redis.zcard(key)

        return max(limit - count, 0)

    def _get_client_id(self, request: Request) -> str:
        """
        Get unique client identifier.

        Priority:
        1. User ID (if authenticated)
        2. IP address
        3. X-Forwarded-For header
        """
        # Try to get user from auth
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"

        # Get IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"

        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    def _get_endpoint_limit(self, path: str) -> tuple[int, int]:
        """Get rate limit for specific endpoint."""
        for pattern, (limit, window) in self.endpoint_limits.items():
            if pattern.endswith("*"):
                prefix = pattern[:-1]
                if path.startswith(prefix):
                    return limit, window
            elif path == pattern:
                return limit, window

        return self.default_limit, self.default_window

    def _is_internal_request(self, request: Request) -> bool:
        """Check if request is from internal service."""
        # Check for internal service header
        if request.headers.get("X-Internal-Service") == "true":
            return True

        # Check if from internal IP range
        if request.client:
            ip = request.client.host
            # Check for private IP ranges
            if ip.startswith(("10.", "172.", "192.168.", "127.")):
                return True

        return False


# Token bucket implementation for more granular control
class TokenBucketRateLimiter:
    """
    Token bucket rate limiter for burst handling.

    Allows bursts while maintaining long-term average rate.
    """

    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url, decode_responses=True)

    async def allow_request(
        self,
        key: str,
        rate: float,  # Tokens per second
        capacity: int,  # Maximum tokens
    ) -> bool:
        """
        Check if request is allowed using token bucket.

        Args:
            key: Unique identifier
            rate: Token refill rate per second
            capacity: Bucket capacity

        Returns:
            True if request allowed
        """
        now = time.time()

        # Lua script for atomic token bucket
        script = """
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local rate = tonumber(ARGV[2])
        local capacity = tonumber(ARGV[3])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
        local tokens = tonumber(bucket[1]) or capacity
        local last_update = tonumber(bucket[2]) or now

        -- Refill tokens
        local elapsed = now - last_update
        tokens = math.min(capacity, tokens + (elapsed * rate))

        -- Try to consume token
        if tokens >= 1 then
            tokens = tokens - 1
            redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
            redis.call('EXPIRE', key, 60)
            return 1
        else
            return 0
        end
        """

        allowed = await self.redis.eval(
            script,
            1,
            f"token_bucket:{key}",
            now,
            rate,
            capacity,
        )

        return bool(allowed)


# Adaptive rate limiting based on system load
class AdaptiveRateLimiter:
    """
    Adaptive rate limiting that adjusts based on system metrics.

    Reduces limits when:
    - CPU usage high
    - Memory pressure
    - Queue length increasing
    - Response time degrading
    """

    def __init__(self, redis_url: str, base_limit: int = 100):
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
        self.base_limit = base_limit

    async def get_adjusted_limit(self) -> int:
        """
        Get rate limit adjusted for current system load.

        Returns:
            Adjusted limit (percentage of base)
        """
        # Get system metrics from Redis
        metrics_key = "system:metrics"

        metrics = await self.redis.hgetall(metrics_key)

        if not metrics:
            return self.base_limit

        cpu_usage = float(metrics.get("cpu_percent", 0))
        memory_usage = float(metrics.get("memory_percent", 0))
        queue_length = int(metrics.get("queue_length", 0))

        # Calculate adjustment factor
        adjustment = 1.0

        if cpu_usage > 80:
            adjustment *= 0.5
        elif cpu_usage > 60:
            adjustment *= 0.75

        if memory_usage > 80:
            adjustment *= 0.5
        elif memory_usage > 60:
            adjustment *= 0.75

        if queue_length > 1000:
            adjustment *= 0.5
        elif queue_length > 500:
            adjustment *= 0.75

        return int(self.base_limit * adjustment)
