"""Tests for frontend URL registration shape.

The bundled JS URLs carry a ``?v=<mtime>`` query so that a new release
(or a local rebuild) busts the browser cache without manual user
action. These tests guard the shape — they don't try to lock in a
specific mtime value, only the contract that *some* cache-buster is
present and changes with the underlying file.
"""

from __future__ import annotations

import os
import re

from custom_components.smart_icons import frontend


def test_painter_url_includes_cache_buster() -> None:
    assert frontend.URL_JS.startswith(
        f"{frontend.URL_BASE}/{frontend.BUNDLE_FILENAME}?v="
    )
    # Cache-buster is a non-empty digit string (mtime in seconds, or "0"
    # fallback when the bundle is missing in dev/CI before a build).
    suffix = frontend.URL_JS.split("?v=", 1)[1]
    assert re.fullmatch(r"\d+", suffix)


def test_panel_url_includes_cache_buster() -> None:
    assert frontend.URL_PANEL_JS.startswith(
        f"{frontend.URL_BASE}/{frontend.PANEL_BUNDLE_FILENAME}?v="
    )
    suffix = frontend.URL_PANEL_JS.split("?v=", 1)[1]
    assert re.fullmatch(r"\d+", suffix)


def test_cache_buster_tracks_file_mtime(tmp_path, monkeypatch) -> None:
    """A different mtime on disk yields a different cache-buster.

    Ensures the value isn't accidentally constant (e.g. import-time
    snapshot of a stale path); each release / rebuild produces a fresh
    URL.
    """
    bundle = tmp_path / "fake_bundle.js"
    bundle.write_text("// fake")

    monkeypatch.setattr(frontend, "STATIC_DIR", str(tmp_path))

    first = frontend._bundle_cache_buster("fake_bundle.js")

    # Bump mtime forward by 60 s — well past any filesystem resolution
    # quirks, no flakiness on coarse-grained mtime backends.
    later = os.path.getmtime(bundle) + 60
    os.utime(bundle, (later, later))

    second = frontend._bundle_cache_buster("fake_bundle.js")

    assert first != second
    assert second == str(int(later))


def test_cache_buster_missing_file_returns_zero(tmp_path, monkeypatch) -> None:
    """Missing-bundle dev/CI case: fall back to ``0`` rather than raise."""
    monkeypatch.setattr(frontend, "STATIC_DIR", str(tmp_path))
    assert frontend._bundle_cache_buster("nonexistent.js") == "0"
