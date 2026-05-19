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
