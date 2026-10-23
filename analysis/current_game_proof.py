"""Reproducible, descriptive current-game proof of value. No forecasts or coach attribution."""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STRENGTHS = {'all', '5on5', '5on4', '4on5', 'other'}


def total(rows, column):
    values = [r[column] for r in rows]
    if not values or any(v is None or str(v).strip().lower() in {'', 'na', 'null'} for v in values):
        raise ValueError(f'Missing input for {column}; no zero imputation')
    return sum(float(v) for v in values)


def share(a, b):
    return None if a + b == 0 else 100 * a / (a + b)


def analyze(data):
    raw = data['inputs']
    teams, skaters, goalies = (raw[k] for k in ('teams', 'skaters', 'goalies'))
    assert data['season'] == '20262027'
    all_games = sorted((r for r in teams if r['situation'] == 'all'), key=lambda r: r['gameDate'])
    game_ids = {r['gameId'] for r in all_games}
    assert len(game_ids) == len(all_games) and game_ids
    for kind, rows in raw.items():
        keys = [(r['gameId'], r['situation'], r.get('playerId')) for r in rows]
        assert len(keys) == len(set(keys)), f'Duplicate {kind} key'
        assert {r['gameId'] for r in rows} == game_ids, f'{kind} game coverage differs'
        assert all(r['gameId'].startswith('202602') for r in rows), 'Wrong season or game type'
        assert all(r.get('team', r.get('playerTeam')) == 'TOR' for r in rows)
        for game in all_games:
            selected = [r for r in rows if r['gameId'] == game['gameId']]
            assert all(r['gameDate'] == game['gameDate'] and r['opposingTeam'] == game['opposingTeam'] for r in selected)
            assert {r['situation'] for r in selected} == STRENGTHS

    # Verify player counts and additive individual totals. On-ice xG overlaps
    # between players and is deliberately never summed as a team contribution.
    reconciliation_notes = []
    for game in all_games:
        appearances = [r for r in skaters if r['gameId'] == game['gameId'] and r['situation'] == 'all']
        assert len(appearances) == 18
        for strength in STRENGTHS:
            team = next(r for r in teams if r['gameId'] == game['gameId'] and r['situation'] == strength)
            players = [r for r in skaters if r['gameId'] == game['gameId'] and r['situation'] == strength]
            for individual, team_field in [('I_F_goals', 'goalsFor'), ('I_F_xGoals', 'xGoalsFor'), ('I_F_unblockedShotAttempts', 'unblockedShotAttemptsFor')]:
                delta = total(players, individual) - float(team[team_field])
                if abs(delta) > .02:  # Provider publishes per-row rounded xG.
                    note = {'game_id': game['gameId'], 'strength': strength, 'field': individual, 'delta': delta}
                    assert strength == 'other', f'Primary source reconciliation failed: {note}'
                    reconciliation_notes.append(note)
        parts = [r for r in teams if r['gameId'] == game['gameId'] and r['situation'] != 'all']
        for field in ['goalsFor', 'goalsAgainst', 'xGoalsFor', 'xGoalsAgainst']:
            assert abs(total(parts, field) - float(game[field])) < .01

    five = [r for r in teams if r['situation'] == '5on5']
    xgf, xga = total(five, 'xGoalsFor'), total(five, 'xGoalsAgainst')
    shots_for, shots_against = total(five, 'shotsOnGoalFor'), total(five, 'shotsOnGoalAgainst')
    attempts_for, attempts_against = total(five, 'unblockedShotAttemptsFor'), total(five, 'unblockedShotAttemptsAgainst')
    quality_for, quality_against = xgf / attempts_for, xga / attempts_against
    volume_component = (attempts_for - attempts_against) * (quality_for + quality_against) / 2
    quality_component = (quality_for - quality_against) * (attempts_for + attempts_against) / 2
    assert abs(volume_component + quality_component - (xgf - xga)) < 1e-10
    # This is leave-one-game-out sensitivity, not a confidence interval.
    sensitivity = [{'omitted_game': r['gameId'], 'xg_share': share(xgf - float(r['xGoalsFor']), xga - float(r['xGoalsAgainst']))} for r in five]
    game_rows = []
    for game in all_games:
        r = next(r for r in five if r['gameId'] == game['gameId'])
        game_rows.append({'game_id': r['gameId'], 'date': f"{r['gameDate'][:4]}-{r['gameDate'][4:6]}-{r['gameDate'][6:]}", 'opponent': r['opposingTeam'], 'shots_for': float(r['shotsOnGoalFor']), 'shots_against': float(r['shotsOnGoalAgainst']), 'xgf': float(r['xGoalsFor']), 'xga': float(r['xGoalsAgainst']), 'shot_share': share(float(r['shotsOnGoalFor']), float(r['shotsOnGoalAgainst'])), 'xg_share': share(float(r['xGoalsFor']), float(r['xGoalsAgainst']))})

    player_summaries = []
    for player_id in {r['playerId'] for r in skaters}:
        rows = [r for r in skaters if r['playerId'] == player_id and r['situation'] == '5on5']
        xf, xa = total(rows, 'OnIce_F_xGoals'), total(rows, 'OnIce_A_xGoals')
        latest = next((r for r in rows if r['gameId'] == all_games[-1]['gameId']), None)
        player_summaries.append({'player_id': player_id, 'name': rows[0]['name'], 'appearances': len(rows), 'minutes': total(rows, 'icetime') / 60, 'goals': total(rows, 'I_F_goals'), 'ixg': total(rows, 'I_F_xGoals'), 'onice_xgf': xf, 'onice_xga': xa, 'onice_xg_share': share(xf, xa), 'latest_unblocked_attempts': float(latest['I_F_unblockedShotAttempts']) if latest else None})
    player_summaries.sort(key=lambda r: r['ixg'], reverse=True)
    for rank, r in enumerate(player_summaries, 1):
        r['ixg_rank_in_current_tor_appearances'] = rank
    goalie_rows = []
    for name in sorted({r['name'] for r in goalies}):
        for strength in ['all', '5on5', '4on5', '5on4', 'other']:
            rows = [r for r in goalies if r['name'] == name and r['situation'] == strength]
            gx, ga = total(rows, 'xGoals'), total(rows, 'goals')
            goalie_rows.append({'name': name, 'strength': strength, 'appearances': len(rows), 'minutes': total(rows, 'icetime') / 60, 'xga': gx, 'ga': ga, 'gsax': gx - ga})
    latest_parts = [{'strength': r['situation'], 'gf': float(r['goalsFor']), 'ga': float(r['goalsAgainst']), 'xgf': float(r['xGoalsFor']), 'xga': float(r['xGoalsAgainst'])} for r in teams if r['gameId'] == all_games[-1]['gameId']]
    return {
        'season': data['season'], 'generated_at': datetime.now(timezone.utc).isoformat(),
        'coverage': {'games': len(all_games), 'first_date': game_rows[0]['date'], 'last_date': game_rows[-1]['date'], 'skater_appearances': len(skaters) // 5, 'goalie_appearances': len(goalies) // 5},
        'source_manifest': data['source_manifest'], 'source_reconciliation_notes': reconciliation_notes,
        'five_on_five': {'xgf': xgf, 'xga': xga, 'xg_share': share(xgf, xga), 'shots_for': shots_for, 'shots_against': shots_against, 'shot_share': share(shots_for, shots_against), 'unblocked_attempts_for': attempts_for, 'unblocked_attempts_against': attempts_against, 'xg_per_unblocked_attempt_for': quality_for, 'xg_per_unblocked_attempt_against': quality_against, 'high_danger_for': total(five, 'highDangerShotsFor'), 'high_danger_against': total(five, 'highDangerShotsAgainst'), 'games_below_half_xg': sum(r['xg_share'] < 50 for r in game_rows), 'sensitivity': sensitivity, 'descriptive_xg_gap_decomposition': {'volume': volume_component, 'quality': quality_component, 'method': 'Symmetric product decomposition; descriptive arithmetic, not causal attribution'}},
        'games': game_rows, 'players': player_summaries, 'goalies': goalie_rows, 'latest_game_strengths': latest_parts,
        'limits': [f'{len(all_games)} current-season games; no prior-season baseline or predictive certainty.', 'Raw xG is not adjusted for score state, opponent strength or deployment.', 'On-ice stats are shared outcomes and do not isolate individual player impact.', 'Player other-situation totals differ from team other totals in the recorded reconciliation notes; exclude those player partitions from interpretation.', 'No shot timestamps, zone entries, tracking data, shared-line minutes or video coding; no claims about tactics or coach causation.']
    }


def chart_payload(result):
    rows = []
    for r in result['games']:
        label = r['date'][5:] + ' ' + r['opponent']
        for series, field in [('Shot share', 'shot_share'), ('Chance-quality share', 'xg_share')]:
            rows.append({'game': label, 'measure': series, 'share': round(r[field], 2)})
    return {'schemaVersion': 1, 'id': 'leafs-current-shot-quality', 'title': 'Current games: 5-on-5 shot share vs chance-quality share', 'description': f"Toronto · {result['coverage']['first_date']}–{result['coverage']['last_date']} · {result['coverage']['games']} completed games", 'chart': {'type': 'line', 'x': 'game', 'y': 'share', 'series': 'measure', 'showXAxisLabel': False, 'yLabel': 'Toronto share (%)'}, 'rows': rows, 'source': {'label': 'MoneyPuck Toronto game CSV; filtered to 2026 regular season and 5on5', 'files': [{'label': s['kind'] + ' original CSV', 'sha256': s['sha256']} for s in result['source_manifest']['sources'] if s['kind'] == 'teams'], 'caveats': ['Raw unadjusted xG; descriptive current-season sample. Shot share uses shots on goal.', 'Source retrieval timestamps and original hashes are recorded in current-proof-results.json; provider refresh time is unconfirmed.']}, 'generatedAt': result['generated_at'], 'theme': 'codex-classic'}


def plot(result, output):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.rcParams.update({'font.size': 11, 'axes.spines.top': False, 'axes.spines.right': False})
    fig, axes = plt.subplots(2, 1, figsize=(10, 7.6), constrained_layout=True)
    games = result['games']
    labels = [r['date'][5:] + '\n' + r['opponent'] for r in games]
    axes[0].plot(labels, [r['shot_share'] for r in games], 'o--', label='Shots on goal share', color='#778a9b')
    axes[0].plot(labels, [r['xg_share'] for r in games], 'o-', label='Chance-quality (xG) share', color='#0055a5')
    axes[0].axhline(50, color='#555555', lw=1)
    axes[0].set(ylabel='Toronto share (%)', title='Current games: shot volume and chance quality', ylim=(0, 100))
    axes[0].legend(frameon=False)
    bob = [next(r for r in result['goalies'] if r['name'] == 'Sergei Bobrovsky' and r['strength'] == s) for s in ['all', '5on5', '4on5']]
    axes[1].barh(['All strengths\n(inclusive)', '5-on-5', '4-on-5'], [r['gsax'] for r in bob], color='#0055a5')
    axes[1].axvline(0, color='#555555', lw=1)
    axes[1].invert_yaxis()
    for i, r in enumerate(bob):
        axes[1].text(r['gsax'] + (.1 if r['gsax'] >= 0 else -.1), i, f"{r['gsax']:+.2f}", va='center', ha='left' if r['gsax'] >= 0 else 'right')
    axes[1].set(xlabel='Goalie xGA minus goals allowed (GSAx)', title='Bobrovsky: the overall result hides opposite strength-level results')
    axes[1].set_xlim(min(r['gsax'] for r in bob) - 1, max(r['gsax'] for r in bob) + 1)
    fig.suptitle(f"Leafs Lab · 2026–27 through {result['coverage']['last_date']}\nMoneyPuck inputs · {len(games)} team games; {bob[0]['appearances']} Bobrovsky appearances", fontsize=13)
    fig.savefig(output, dpi=160)
    plt.close(fig)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--plot', action='store_true')
    args = parser.parse_args()
    data = json.loads((ROOT / 'data/current-2026.json').read_text())
    result = analyze(data)
    (ROOT / 'current-proof-results.json').write_text(json.dumps(result, indent=2) + '\n')
    (ROOT / 'current-proof-chart.json').write_text(json.dumps(chart_payload(result), indent=2) + '\n')
    if args.plot:
        plot(result, ROOT / 'current-proof.png')
    print(json.dumps({'coverage': result['coverage'], 'five_on_five': result['five_on_five'], 'source_reconciliation_notes': result['source_reconciliation_notes'], 'goalies': result['goalies'], 'selected_players': [r for r in result['players'] if r['name'] in {'Kirill Marchenko', 'William Nylander'}]}, indent=2))
