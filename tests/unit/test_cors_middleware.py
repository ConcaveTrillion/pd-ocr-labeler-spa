"""Regression tests for the CORS middleware on ``build_app``.

Iter-5 review B-03: ``allow_origins=["*"]`` paired with
``allow_credentials=True`` is invalid per the CORS spec — browsers
reject the response. ``pd-prep-for-pgdp`` (the declared structural
model) sets only ``allow_origins``/``allow_methods``/``allow_headers``;
spec ``specs/02-backend.md §step-7`` matches.

We introspect ``app.user_middleware`` because Starlette stores
middleware-class + kwargs on each entry. That's the cheapest way to
assert the wired config without spinning up a TestClient and round-
tripping a preflight (which can mask config bugs by being lenient).
"""

from __future__ import annotations

from fastapi.middleware.cors import CORSMiddleware

from pd_ocr_labeler_spa.bootstrap import build_app
from pd_ocr_labeler_spa.settings import Settings


def _cors_kwargs(app):
    """Return the kwargs dict CORSMiddleware was added with.

    Starlette ``Middleware`` is a dataclass-ish wrapper exposing
    ``cls`` (the middleware class) and ``kwargs`` (a dict). Older
    versions used ``options`` instead — handle both.
    """
    for entry in app.user_middleware:
        cls = getattr(entry, "cls", None)
        if cls is CORSMiddleware:
            # New Starlette: .kwargs; older: .options.
            return getattr(entry, "kwargs", None) or getattr(entry, "options", {})
    raise AssertionError("CORSMiddleware not registered on app")


def test_cors_middleware_does_not_combine_wildcard_with_credentials() -> None:
    # The whole point of B-03: rejecting the invalid combo.
    app = build_app(Settings(mode="api_only"))
    kwargs = _cors_kwargs(app)
    if kwargs.get("allow_origins") == ["*"] or "*" in (kwargs.get("allow_origins") or []):
        assert not kwargs.get("allow_credentials", False), (
            "CORSMiddleware sets allow_origins=['*'] together with "
            "allow_credentials=True — browsers reject this combo. See "
            "docs/BUGS_FOUND.md B-03."
        )


def test_cors_middleware_matches_pgdp_prep_shape() -> None:
    # Spec specs/02-backend.md §step-7 lists the three wildcards; pgdp-prep
    # uses the same shape. Pin it so a refactor doesn't silently
    # reintroduce credentials.
    app = build_app(Settings(mode="api_only"))
    kwargs = _cors_kwargs(app)
    assert kwargs.get("allow_origins") == ["*"]
    assert kwargs.get("allow_methods") == ["*"]
    assert kwargs.get("allow_headers") == ["*"]
    # Either absent or explicitly False — both are acceptable.
    assert kwargs.get("allow_credentials", False) is False
