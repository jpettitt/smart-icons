"""Store tests for RuleStore."""

from __future__ import annotations

import pytest


def _mapping_rule(**overrides):
    data = {
        "target": "media_player.tv",
        "source": "input_select.scene",
        "mode": "mapping",
        "mapping": {"on": {"color": "#fff"}},
    }
    data.update(overrides)
    return data


async def test_load_empty(store):
    assert store.all() == []


async def test_upsert_assigns_id_and_timestamps(store):
    rule = await store.async_upsert(_mapping_rule())
    assert rule.id
    assert rule.created
    assert rule.updated == rule.created


async def test_upsert_preserves_created_on_update(store):
    rule = await store.async_upsert(_mapping_rule())
    original_created = rule.created

    updated = await store.async_upsert({**rule.to_dict(), "priority": 99})
    assert updated.id == rule.id
    assert updated.created == original_created
    assert updated.updated >= original_created
    assert updated.priority == 99


async def test_delete_existing(store):
    rule = await store.async_upsert(_mapping_rule())
    assert await store.async_delete(rule.id) is True
    assert store.get(rule.id) is None


async def test_delete_unknown_returns_false(store):
    assert await store.async_delete("nope") is False


async def test_by_target_filters(store):
    a = await store.async_upsert(_mapping_rule(target="light.a"))
    b = await store.async_upsert(_mapping_rule(target="light.b"))
    targets_a = store.by_target("light.a")
    assert [r.id for r in targets_a] == [a.id]
    assert b.id not in {r.id for r in targets_a}


async def test_subscribe_emits_events(store):
    events: list[tuple[str, str]] = []

    def listen(event, rule):
        events.append((event, rule.id))

    unsub = store.subscribe(listen)
    rule = await store.async_upsert(_mapping_rule())
    await store.async_upsert({**rule.to_dict(), "priority": 5})
    await store.async_delete(rule.id)
    unsub()
    # After unsubscribe, no further events.
    await store.async_upsert(_mapping_rule())

    kinds = [e[0] for e in events]
    assert kinds == ["added", "updated", "removed"]


async def test_round_trip_through_save_load(hass, store):
    # Upsert two rules, force-save, build a fresh store on the same hass,
    # confirm we see the same rules back.
    rule_a = await store.async_upsert(_mapping_rule(target="light.a"))
    rule_b = await store.async_upsert(_mapping_rule(target="light.b"))

    from custom_components.smart_icons.store import RuleStore

    fresh = RuleStore(hass)
    await fresh.async_load()
    ids = {r.id for r in fresh.all()}
    assert ids == {rule_a.id, rule_b.id}


async def test_load_skips_corrupt_entries(hass, tmp_path, monkeypatch):
    """A bad entry on disk is dropped, good entries still load."""
    from custom_components.smart_icons.store import RuleStore

    fresh = RuleStore(hass)
    # Reach into the Store wrapper and seed bad + good rows directly.
    await fresh._store.async_save(  # noqa: SLF001 — deliberate test hook
        {
            "rules": [
                {"target": "not-an-entity", "mode": "mapping", "id": "01BAD"},
                {
                    "id": "01GOOD",
                    "target": "light.kitchen",
                    "mode": "mapping",
                    "mapping": {"on": {"color": "#fff"}},
                },
            ]
        }
    )
    await fresh.async_load()
    ids = [r.id for r in fresh.all()]
    assert ids == ["01GOOD"]


@pytest.mark.parametrize("priority", [1, 10, 100])
async def test_priority_round_trips(store, priority):
    rule = await store.async_upsert(_mapping_rule(priority=priority))
    assert rule.priority == priority


# ---- async_replace_all -------------------------------------------------


async def test_replace_all_swaps_whole_rule_set(store):
    """A normal replace_all updates matching ids, creates new rules,
    and removes rules absent from the new list."""
    a = await store.async_upsert(_mapping_rule(target="light.a"))
    b = await store.async_upsert(_mapping_rule(target="light.b"))
    assert {r.id for r in store.all()} == {a.id, b.id}

    count = await store.async_replace_all(
        [
            # Keep a's id but update its content
            {
                "id": a.id,
                "target": "light.a",
                "mode": "mapping",
                "mapping": {"on": {"color": "#00ff00"}},
            },
            # No id — should mint a fresh one
            {
                "target": "light.c",
                "mode": "mapping",
                "mapping": {"on": {"color": "#0000ff"}},
            },
            # b is omitted, so it should be removed
        ]
    )
    assert count == 2
    rules_by_target = {r.targets[0]: r for r in store.all()}
    assert set(rules_by_target.keys()) == {"light.a", "light.c"}
    assert rules_by_target["light.a"].id == a.id
    assert rules_by_target["light.a"].mapping["on"]["color"] == "#00ff00"
    assert rules_by_target["light.c"].id != a.id  # new ulid


async def test_replace_all_preserves_created_for_matched_ids(store):
    """When a replace_all entry has an id matching an existing rule,
    the original `created` timestamp is preserved (only `updated`
    advances). Mirrors async_upsert's history-preserving behavior."""
    a = await store.async_upsert(_mapping_rule(target="light.a"))
    original_created = a.created

    await store.async_replace_all(
        [
            {
                "id": a.id,
                "target": "light.a",
                "mode": "mapping",
                "mapping": {"on": {"color": "#ffffff"}},
            }
        ]
    )
    refreshed = store.get(a.id)
    assert refreshed.created == original_created
    assert refreshed.updated != original_created


async def test_replace_all_validation_failure_leaves_store_untouched(store):
    """If ANY rule fails validation, the whole batch is rejected —
    BulkReplaceError is raised and the existing rule set is unchanged.
    This is the atomicity guarantee the panel relies on."""
    from custom_components.smart_icons.rule import BulkReplaceError

    a = await store.async_upsert(_mapping_rule(target="light.a"))
    snapshot = {r.id: r.to_dict() for r in store.all()}

    with pytest.raises(BulkReplaceError) as exc_info:
        await store.async_replace_all(
            [
                # Valid
                {
                    "target": "light.valid",
                    "mode": "mapping",
                    "mapping": {"on": {"color": "#fff"}},
                },
                # Bad: missing mode entirely
                {"target": "light.bad"},
                # Valid
                {
                    "target": "light.also_valid",
                    "mode": "mapping",
                    "mapping": {"on": {"color": "#000"}},
                },
            ]
        )
    err = exc_info.value
    assert len(err.errors) == 1
    assert err.errors[0][0] == 1  # second rule (index 1)
    # Store is unchanged — same single rule, same content.
    assert {r.id: r.to_dict() for r in store.all()} == snapshot
    assert store.get(a.id) is not None


async def test_replace_all_empty_clears_store(store):
    """An empty list removes every rule. The destructive behavior is
    guarded by a confirm modal in the UI, not in the store layer."""
    await store.async_upsert(_mapping_rule(target="light.a"))
    await store.async_upsert(_mapping_rule(target="light.b"))
    assert len(store.all()) == 2

    count = await store.async_replace_all([])
    assert count == 0
    assert store.all() == []


async def test_replace_all_fires_diff_events(store):
    """Replace fans out `added` / `updated` / `removed` events
    matching the diff so subscribers (frontend rule-store) can
    reconcile incrementally — no full-refresh needed."""
    a = await store.async_upsert(_mapping_rule(target="light.a"))
    b = await store.async_upsert(_mapping_rule(target="light.b"))

    events: list[tuple[str, str]] = []
    store.subscribe(lambda ev, rule: events.append((ev, rule.id)))

    await store.async_replace_all(
        [
            # Keep + update a
            {
                "id": a.id,
                "target": "light.a",
                "mode": "mapping",
                "mapping": {"on": {"color": "#abc"}},
            },
            # New rule (no id)
            {
                "target": "light.new",
                "mode": "mapping",
                "mapping": {"on": {"color": "#def"}},
            },
            # b is dropped
        ]
    )
    kinds = [ev for ev, _ in events]
    assert "removed" in kinds
    assert "updated" in kinds
    assert "added" in kinds
    # The removed event carried b's id, the updated event carried a's id.
    assert ("removed", b.id) in events
    assert ("updated", a.id) in events


async def test_replace_all_rejects_non_dict_entries(store):
    """Per-rule guard: non-mapping entries get a clean error message
    rather than crashing the validation pipeline."""
    from custom_components.smart_icons.rule import BulkReplaceError

    with pytest.raises(BulkReplaceError) as exc_info:
        await store.async_replace_all(["just-a-string", {"target": "x"}])
    indices = [i for i, _ in exc_info.value.errors]
    assert 0 in indices
    assert any("mapping" in m for _, m in exc_info.value.errors)


# ---------------------------------------------------------------------------
# Options API
# ---------------------------------------------------------------------------


async def test_default_options_include_outline_enabled(store):
    """Fresh store starts with the documented defaults (outline on)."""
    opts = store.get_options()
    assert opts == {"outline_enabled": True}
    assert store.get_option("outline_enabled") is True


async def test_get_option_unknown_returns_default(store):
    """`get_option` defaults to None for unknown keys; explicit default
    is honored. Lets callers (the frontend painter) probe for future
    options safely on older backends."""
    assert store.get_option("not_a_real_option") is None
    assert store.get_option("not_a_real_option", "fallback") == "fallback"


async def test_update_options_merges_not_replaces(store):
    """Partial updates leave untouched keys at their existing values —
    a panel that only sends the field it changed never clobbers
    unrelated options the user set earlier."""
    await store.async_update_options({"outline_enabled": False})
    assert store.get_option("outline_enabled") is False
    # Re-saving without the key keeps the False value.
    await store.async_update_options({})
    assert store.get_option("outline_enabled") is False


async def test_update_options_fires_bus_event(hass, store):
    """Frontend painters subscribed to the bus event receive the
    new options snapshot on change — this is the channel non-admin
    users use to learn about admin toggles."""
    from custom_components.smart_icons.const import EVENT_OPTIONS_UPDATED

    received: list[dict] = []

    def _capture(event):
        received.append(event.data)

    hass.bus.async_listen(EVENT_OPTIONS_UPDATED, _capture)

    await store.async_update_options({"outline_enabled": False})
    await hass.async_block_till_done()

    assert received == [{"outline_enabled": False}]


async def test_update_options_skips_event_on_no_change(hass, store):
    """No-op updates (resending the current value) don't fire the
    bus event — avoids spurious frontend repaints when a panel
    re-emits options on save."""
    from custom_components.smart_icons.const import EVENT_OPTIONS_UPDATED

    fired = []
    hass.bus.async_listen(EVENT_OPTIONS_UPDATED, lambda ev: fired.append(ev.data))

    # outline_enabled is already True (default); resending should no-op.
    await store.async_update_options({"outline_enabled": True})
    await hass.async_block_till_done()

    assert fired == []


async def test_options_persist_across_reload(hass, store):
    """An admin toggle survives an HA restart: options round-trip via
    the same .storage doc as the rules list."""
    from custom_components.smart_icons.store import RuleStore

    await store.async_update_options({"outline_enabled": False})
    # Re-instantiate against the same underlying storage and reload.
    fresh = RuleStore(hass)
    await fresh.async_load()
    assert fresh.get_option("outline_enabled") is False


async def test_options_unknown_keys_round_trip(hass, store):
    """Future panel versions might write option keys the current
    backend doesn't recognize — the store must preserve them, not
    silently drop, so downgrades don't lose user settings."""
    from custom_components.smart_icons.store import RuleStore

    await store.async_update_options({"future_setting": "v0.4-thing"})
    fresh = RuleStore(hass)
    await fresh.async_load()
    assert fresh.get_option("future_setting") == "v0.4-thing"
