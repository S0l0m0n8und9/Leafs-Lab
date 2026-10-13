"""Pure, full-precision metrics. Incomplete samples propagate missing values."""
from collections.abc import Iterable


def xg_share(xgf: float | None, xga: float | None) -> float | None:
    if xgf is None or xga is None or xgf + xga <= 0:
        return None
    return 100 * xgf / (xgf + xga)


def rate_per60(value: float | None, toi_seconds: float | None) -> float | None:
    if value is None or toi_seconds is None or toi_seconds <= 0:
        return None
    return 3600 * value / toi_seconds


def gsax(xga: float | None, ga: float | None) -> float | None:
    return None if xga is None or ga is None else xga - ga


def complete_sum(rows: list[dict], field: str) -> float | None:
    values = [row.get(field) for row in rows]
    return sum(values) if values and all(value is not None for value in values) else None


def aggregate(rows: Iterable[dict]) -> dict:
    """Aggregate one strength only. A missing component invalidates its total."""
    rows = list(rows)
    fields = ('xgf', 'xga', 'gf', 'ga', 'shots_for', 'shots_against', 'toi_seconds',
              'goals', 'ixg', 'shots', 'onice_xgf', 'onice_xga', 'saves')
    totals = {field: complete_sum(rows, field) for field in fields}
    totals.update(xg_share=xg_share(totals['xgf'], totals['xga']),
                  onice_xg_share=xg_share(totals['onice_xgf'], totals['onice_xga']),
                  finishing_difference=gsax(totals['goals'], totals['ixg']),
                  gsax=gsax(totals['xga'], totals['ga']),
                  goals_per60=rate_per60(totals['goals'], totals['toi_seconds']),
                  ixg_per60=rate_per60(totals['ixg'], totals['toi_seconds']),
                  xgf_per60=rate_per60(totals['xgf'], totals['toi_seconds']),
                  xga_per60=rate_per60(totals['xga'], totals['toi_seconds']))
    return totals


def finishing_label(difference: float | None, appearances: int, toi_seconds: float | None) -> str:
    if appearances < 5 or toi_seconds is None or toi_seconds < 3600:
        return 'Small sample'
    if difference is None:
        return 'Analysis unavailable'
    if difference >= 2:
        return 'Finishing above expectation'
    if difference <= -2:
        return 'Finishing below expectation'
    return 'Finishing near expectation'


def game_verdict(share: float | None, result: str | None) -> str:
    if share is None:
        return 'Analysis unavailable'
    if share >= 55:
        return {'win': 'Strong process, positive result', 'loss': 'Encouraging underlying performance'}.get(result, 'led chance quality')
    if share <= 45:
        return {'win': 'Won despite trailing chance quality', 'loss': 'Result matched weaker chance quality'}.get(result, 'trailed chance quality')
    return 'A close game on chance quality' if result else 'chance quality was close'


def select_window(games: list[dict], size: int, baseline_size: int = 20) -> tuple[list[dict], list[dict]]:
    if size < 1 or baseline_size < 0:
        raise ValueError('Window sizes must be positive (baseline may be zero)')
    ordered = sorted(games, key=lambda game: (game['date'], game['id']))
    start = max(0, len(ordered) - size)
    return ordered[start:], ordered[max(0, start - baseline_size):start]
