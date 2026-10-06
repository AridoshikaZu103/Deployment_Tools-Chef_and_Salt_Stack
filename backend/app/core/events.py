"""
Real-time Deployment Event Broadcaster.
Supports pub/sub event distribution to Server-Sent Events (SSE) and WebSockets.
"""

import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Set
from loguru import logger


class EventBroadcaster:
    """Manages active real-time subscriber queues and dispatches deployment events."""

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()
        self._recent_events: list[dict] = []
        self._max_history = 50

    async def broadcast(self, event: dict) -> None:
        """Broadcast a deployment event to all active SSE/WebSocket clients."""
        if "timestamp" not in event:
            event["timestamp"] = datetime.now(timezone.utc).isoformat()

        # Keep rolling buffer of recent events
        self._recent_events.append(event)
        if len(self._recent_events) > self._max_history:
            self._recent_events.pop(0)

        # Dispatch to active queues
        dead_queues = set()
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass
            except Exception as e:
                logger.warning(f"Failed to put event in queue: {e}")
                dead_queues.add(queue)

        self._subscribers.difference_update(dead_queues)

    async def subscribe(self) -> AsyncGenerator[dict, None]:
        """Subscribe to live deployment events. Yields dict events."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        except asyncio.CancelledError:
            pass
        finally:
            self._subscribers.discard(queue)

    def get_recent_events(self, limit: int = 20) -> list[dict]:
        """Return recently broadcasted events."""
        return self._recent_events[-limit:]


broadcaster = EventBroadcaster()
