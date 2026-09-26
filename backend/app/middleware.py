from __future__ import annotations

import secrets
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi.responses import JSONResponse
from pydantic import SecretStr


class APIKeyMiddleware:
    def __init__(
        self,
        app: Callable[..., Awaitable[None]],
        get_api_key: Callable[[], SecretStr | str | None],
    ) -> None:
        self.app = app
        self.get_api_key = get_api_key

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: Callable[..., Awaitable[dict[str, Any]]],
        send: Callable[..., Awaitable[None]],
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if not (path == "/api/v1" or path.startswith("/api/v1/")):
            await self.app(scope, receive, send)
            return

        if path == "/api/v1/health":
            await self.app(scope, receive, send)
            return

        configured_key = self.get_api_key()
        if configured_key is None:
            response = JSONResponse(
                status_code=503,
                content={"detail": "API key is not configured."},
            )
            await response(scope, receive, send)
            return

        expected = (
            configured_key.get_secret_value()
            if isinstance(configured_key, SecretStr)
            else configured_key
        )
        provided = next(
            (value for name, value in scope.get("headers", []) if name == b"x-api-key"),
            b"",
        )
        expected_bytes = expected.encode("utf-8")
        if not expected_bytes or not secrets.compare_digest(provided, expected_bytes):
            response = JSONResponse(
                status_code=401,
                content={"detail": "A valid X-API-Key header is required."},
                headers={"WWW-Authenticate": "ApiKey"},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)


class RequestBodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    def __init__(
        self,
        app: Callable[..., Awaitable[None]],
        max_body_size: int,
    ) -> None:
        self.app = app
        self.max_body_size = max_body_size

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: Callable[..., Awaitable[dict[str, Any]]],
        send: Callable[..., Awaitable[None]],
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = next(
            (
                value
                for name, value in scope.get("headers", [])
                if name == b"content-length"
            ),
            None,
        )
        if content_length is not None:
            try:
                exceeds_limit = int(content_length) > self.max_body_size
            except ValueError:
                exceeds_limit = False
            if exceeds_limit:
                response = JSONResponse(
                    status_code=413,
                    content={
                        "detail": "Request body exceeds the configured size limit."
                    },
                )
                await response(scope, receive, send)
                return

        received_size = 0
        body_too_large = False

        async def limited_receive() -> dict[str, Any]:
            nonlocal received_size, body_too_large
            message = await receive()
            if message["type"] == "http.request":
                received_size += len(message.get("body", b""))
                if received_size > self.max_body_size:
                    body_too_large = True
                    raise RequestBodyTooLarge
            return message

        async def guarded_send(message: dict[str, Any]) -> None:
            if not body_too_large:
                await send(message)

        try:
            await self.app(scope, limited_receive, guarded_send)
        except RequestBodyTooLarge:
            pass

        if body_too_large:
            response = JSONResponse(
                status_code=413,
                content={
                    "detail": "Request body exceeds the configured size limit."
                },
            )
            await response(scope, receive, send)
