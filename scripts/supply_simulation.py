#!/usr/bin/env python3
"""Standalone playable-balance prototype; does not modify application state.

Run: python3 scripts/supply_simulation.py
Units are abstract capacities per turn. Crop light ratios are research-informed;
equipment capacities, priorities, prices and temperature coverage are game rules.
Water is processing capacity, not a newly generated water inventory. Temperature
is coverage, not degrees Celsius. No livestock or emergency actions in this demo.
"""

import argparse
import copy
import json
from pathlib import Path
from dataclasses import dataclass, field


# Same source as TypeScript, UI and the legacy game adapter.
CATALOG = json.loads((Path(__file__).resolve().parents[1] / "src/data/crop-catalog.json").read_text())
CROPS = CATALOG["crops"]
SOLAR_CAPACITY = 12
WATER_CAPACITY = 12
THERMAL_CAPACITY = 4
BATTERY_CAPACITY = 6
EPSILON = 1e-9


@dataclass
class Greenhouse:
    crop: str
    progress: float = 0
    harvested: int = 0
    research: int = 0


@dataclass
class Base:
    solar: int = 2
    recyclers: int = 1
    thermal: int = 1
    communications: bool = True
    batteries: int = 1
    battery_charge: float = 0
    greenhouses: list = field(default_factory=lambda: [
        Greenhouse("lettuce"), Greenhouse("soybean"), Greenhouse("potato")
    ])


def allocate(available, requests):
    """Allocate in listed priority order; return delivered amounts and remainder."""
    delivered = {}
    for name, demand in requests:
        amount = min(available, demand)
        delivered[name] = amount
        available = max(0, available - amount)
    return delivered, available


def resolve_turn(base, turn, sunlight=1.0, extreme_weather=False):
    """Pure transition: returns a copied next state plus a report.

    Power priority: habitat, oxygen, thermal, recycling, communications, crops.
    Water priority: habitat, oxygen, crops. Thermal priority: habitat, crops.
    Greenhouse list order is the player's agricultural priority order.
    Partially powered utility plants provide proportional service capacity.
    Supply is pooled: this prototype assumes all facilities are connected.
    """
    if sunlight < 0:
        raise ValueError("Sunlight must be nonnegative")
    for count in (base.solar, base.recyclers, base.thermal, base.batteries):
        if not isinstance(count, int) or count < 0:
            raise ValueError("Building counts must be nonnegative integers")
    if not 0 <= base.battery_charge <= base.batteries * BATTERY_CAPACITY:
        raise ValueError("Battery charge exceeds installed capacity")
    if any(g.crop not in CROPS for g in base.greenhouses):
        raise ValueError("Unknown crop")
    state = copy.deepcopy(base)
    thermal_power = state.thermal * (4 if extreme_weather else 2)
    requests = [
        ("habitat", 1), ("oxygen", 1), ("thermal", thermal_power),
        ("recycling", state.recyclers),
        ("communications", int(state.communications)),
    ] + [(f"crop_{i}", CROPS[g.crop]["power"])
         for i, g in enumerate(state.greenhouses)]
    generation = state.solar * SOLAR_CAPACITY * sunlight
    demand = sum(amount for _, amount in requests)
    discharge = min(max(0, demand - generation), state.battery_charge,
                    state.batteries * BATTERY_CAPACITY)
    state.battery_charge -= discharge
    power, surplus = allocate(generation + discharge, requests)
    charging = min(surplus, state.batteries * BATTERY_CAPACITY - state.battery_charge)
    state.battery_charge += charging

    water_supply = WATER_CAPACITY * power["recycling"]
    thermal_supply = (THERMAL_CAPACITY * state.thermal
                      * power["thermal"] / thermal_power) if thermal_power else 0
    water_requests = [("habitat", 1), ("oxygen", 1)] + [
        (f"crop_{i}", CROPS[g.crop]["water"])
        for i, g in enumerate(state.greenhouses)
    ]
    thermal_requests = [("habitat", 1)] + [
        (f"crop_{i}", CROPS[g.crop]["thermal"]) for i, g in enumerate(state.greenhouses)
    ]
    water, _ = allocate(water_supply, water_requests)
    thermal, _ = allocate(thermal_supply, thermal_requests)
    # Immediate critical-service check; oxygen reserves/rescue are outside scope.
    critical = []
    for system, values, names in (
        ("power", power, ("habitat", "oxygen")),
        ("water", water, ("habitat", "oxygen")),
        ("thermal", thermal, ("habitat",)),
    ):
        for name in names:
            if values[name] < 1 - EPSILON:
                critical.append(f"{name}: insufficient {system}")

    crop_reports = []
    for i, greenhouse in enumerate(state.greenhouses):
        config = CROPS[greenhouse.crop]
        key = f"crop_{i}"
        coverage = {
            "power": power[key] / config["power"],
            "water": water[key] / config["water"],
            "thermal": thermal[key] / config["thermal"],
        }
        growth = min(1, *coverage.values())
        greenhouse.progress += growth
        harvest = 0
        research = 0
        if greenhouse.progress >= config["cycle"] - EPSILON:
            harvest = config["yield"]
            greenhouse.harvested += harvest
            research = config["researchYield"]
            greenhouse.research += research
            greenhouse.progress = 0  # Automatic replant; starts next turn.
        crop_reports.append({
            "id": key, "crop": greenhouse.crop, "coverage": coverage,
            "growth": growth, "progress": greenhouse.progress,
            "harvest": harvest, "cumulative": greenhouse.harvested,
            "research": research, "research_cumulative": greenhouse.research,
        })
    report = {
        "turn": turn,
        "power": {"supply": generation, "demand": demand,
                  "battery_used": discharge, "battery_charge": state.battery_charge,
                  "curtailed_surplus": surplus - charging},
        "water": {"supply": water_supply, "demand": sum(v for _, v in water_requests)},
        "thermal": {"supply": thermal_supply, "demand": sum(value for _, value in thermal_requests)},
        "crops": crop_reports, "critical": critical,
        "total_harvest": sum(g.harvested for g in state.greenhouses),
        "total_research": sum(g.research for g in state.greenhouses),
        "balance_version": CATALOG["balanceVersion"],
    }
    return state, report


def run_demo():
    base = Base()
    turns = []
    for turn in range(1, 13):
        # Scripted gameplay events, not estimated lunar event frequencies.
        sunlight = 0.5 if turn == 4 else (0.75 if turn >= 10 else 1)
        base, report = resolve_turn(base, turn, sunlight, extreme_weather=turn == 7)
        turns.append(report)

    scenarios = {}
    cases = {
        "one_solar_no_battery": Base(solar=1, batteries=0),
        "thermal_overload": Base(solar=3, greenhouses=[Greenhouse("lettuce") for _ in range(4)]),
        "water_overload": Base(solar=5, thermal=2, greenhouses=[Greenhouse("soybean") for _ in range(6)]),
        "no_water_recycler": Base(recyclers=0),
    }
    for name, scenario in cases.items():
        _, scenarios[name] = resolve_turn(scenario, 1)
    return {"reference_mission": turns, "shortage_scenarios": scenarios}


def check_results(results):
    """Check conservation, dependency failures and known reference outcomes."""
    turns = results["reference_mission"]
    assert turns[-1]["total_harvest"] == 200
    assert all(not turn["critical"] for turn in turns)
    assert turns[3]["power"]["battery_used"] == 4
    scenarios = results["shortage_scenarios"]
    growth = [g["growth"] for g in scenarios["one_solar_no_battery"]["crops"]]
    assert abs(growth[0] - 1) < EPSILON and abs(growth[1] - 1) < EPSILON
    assert growth[2] == 0
    assert scenarios["thermal_overload"]["crops"][-1]["growth"] == 0
    assert scenarios["water_overload"]["crops"][-1]["growth"] == 0
    assert scenarios["no_water_recycler"]["critical"]
    assert all(g["growth"] == 0 for g in scenarios["no_water_recycler"]["crops"])
    for report in turns + list(scenarios.values()):
        p = report["power"]
        assert p["battery_used"] <= 6 + EPSILON
        assert p["battery_charge"] >= 0
        assert all(0 <= g["growth"] <= 1 for g in report["crops"])
    original = Base()
    resolve_turn(original, 1)
    assert original.battery_charge == 0 and all(g.progress == 0 for g in original.greenhouses)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print complete machine-readable results")
    args = parser.parse_args()
    results = run_demo()
    check_results(results)
    if args.json:
        print(json.dumps(results, indent=2))
        return
    print("SUPPLY MODEL — checks passed; capacities are game units per turn")
    print("Turn  Electricity  Water  Thermal  Battery  Harvest(total)")
    for r in results["reference_mission"]:
        p, w, t = r["power"], r["water"], r["thermal"]
        print(f"{r['turn']:>4}  {p['supply']:>5g}/{p['demand']:<5g}  "
              f"{w['supply']:g}/{w['demand']:g}   {t['supply']:g}/{t['demand']:g}      "
              f"{p['battery_charge']:>4g}     {r['total_harvest']:>4}")
    print("\nShortages: growth per greenhouse (1 = full turn)")
    for name, r in results["shortage_scenarios"].items():
        growth = ", ".join(f"{g['crop']}={g['growth']:.2f}" for g in r["crops"])
        print(f"{name}: {growth}; critical={bool(r['critical'])}")
    print("\nReference mission: 200 harvest points / target 180 — PASS")


if __name__ == "__main__":
    main()
