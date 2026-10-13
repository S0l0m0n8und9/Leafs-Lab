// Verified snapshot companion; regenerate from analysis/current-proof-results.json when coverage changes.
import type { Bundle, Season } from './data.js';
export const watchSnapshot = {
  season: '20262027',
  max_game_date: '2026-10-10',
  game_ids: [
    '2026020002',
    '2026020008',
    '2026020023',
    '2026020044',
    '2026020065',
    '2026020080',
  ],
  source_hashes: {
    goalies:
      'sha256:7d392c1aa8aa3a7ed72d7d3e46c375e194fa6ad207ec8a9c1a00741476f69435',
    skaters:
      'sha256:a211f3c2478113e47c9005f254be6bd03c6c7b69034ed45dbbd44601e6be4921',
    teams:
      'sha256:1e88e24f39180a90f547e4bdebe7d013cd2a109976aebc78a4ed8b218e972661',
  },
  team: {
    xgf: 10.253,
    xga: 14.716999999999999,
    xg_share: 41.06127352823388,
    shots_for: 130.0,
    shots_against: 132.0,
    shot_share: 49.61832061068702,
    unblocked_attempts_for: 188.0,
    unblocked_attempts_against: 204.0,
    xg_per_unblocked_attempt_for: 0.054537234042553194,
    xg_per_unblocked_attempt_against: 0.0721421568627451,
    high_danger_for: 2.0,
    high_danger_against: 11.0,
    games_below_half_xg: 5,
    sensitivity: [
      {
        omitted_game: '2026020002',
        xg_share: 39.412644968200524,
      },
      {
        omitted_game: '2026020008',
        xg_share: 41.09919083553051,
      },
      {
        omitted_game: '2026020023',
        xg_share: 41.582364487392425,
      },
      {
        omitted_game: '2026020044',
        xg_share: 39.493734335839605,
      },
      {
        omitted_game: '2026020065',
        xg_share: 42.49345705448489,
      },
      {
        omitted_game: '2026020080',
        xg_share: 42.28457885044102,
      },
    ],
    descriptive_xg_gap_decomposition: {
      volume: -1.0134351272423863,
      quality: -3.450564872757613,
      method:
        'Symmetric product decomposition; descriptive arithmetic, not causal attribution',
    },
  },
  games: [
    {
      game_id: '2026020002',
      date: '2026-09-29',
      opponent: 'MTL',
      shots_for: 23.0,
      shots_against: 19.0,
      xgf: 1.825,
      xga: 1.761,
      shot_share: 54.76190476190476,
      xg_share: 50.892359174567765,
    },
    {
      game_id: '2026020008',
      date: '2026-09-30',
      opponent: 'NYI',
      shots_for: 18.0,
      shots_against: 21.0,
      xgf: 1.212,
      xga: 1.76,
      shot_share: 46.15384615384615,
      xg_share: 40.780619111709285,
    },
    {
      game_id: '2026020023',
      date: '2026-10-03',
      opponent: 'OTT',
      shots_for: 24.0,
      shots_against: 18.0,
      xgf: 1.991,
      xga: 3.11,
      shot_share: 57.142857142857146,
      xg_share: 39.03156243873751,
    },
    {
      game_id: '2026020044',
      date: '2026-10-06',
      opponent: 'NSH',
      shots_for: 27.0,
      shots_against: 21.0,
      xgf: 2.374,
      xga: 2.646,
      shot_share: 56.25,
      xg_share: 47.29083665338646,
    },
    {
      game_id: '2026020065',
      date: '2026-10-08',
      opponent: 'VGK',
      shots_for: 19.0,
      shots_against: 31.0,
      xgf: 1.323,
      xga: 2.632,
      shot_share: 38.0,
      xg_share: 33.451327433628315,
    },
    {
      game_id: '2026020080',
      date: '2026-10-10',
      opponent: 'COL',
      shots_for: 19.0,
      shots_against: 22.0,
      xgf: 1.528,
      xga: 2.808,
      shot_share: 46.34146341463415,
      xg_share: 35.239852398523986,
    },
  ],
  marchenko: {
    player_id: '8480893',
    name: 'Kirill Marchenko',
    appearances: 6,
    minutes: 87.83333333333333,
    goals: 0.0,
    ixg: 1.457,
    onice_xgf: 3.584,
    onice_xga: 3.0540000000000003,
    onice_xg_share: 53.992166315155174,
    latest_unblocked_attempts: 0.0,
    ixg_rank_in_current_tor_appearances: 2,
  },
  bobrovsky: [
    {
      name: 'Sergei Bobrovsky',
      strength: 'all',
      appearances: 4,
      minutes: 242.5,
      xga: 16.675,
      ga: 12.0,
      gsax: 4.675000000000001,
    },
    {
      name: 'Sergei Bobrovsky',
      strength: '5on5',
      appearances: 4,
      minutes: 187.38333333333333,
      xga: 10.311,
      ga: 12.0,
      gsax: -1.689,
    },
    {
      name: 'Sergei Bobrovsky',
      strength: '4on5',
      appearances: 4,
      minutes: 27.733333333333334,
      xga: 4.579000000000001,
      ga: 0.0,
      gsax: 4.579000000000001,
    },
  ],
} as const;

export function matchesWatchSnapshot(bundle: Bundle, season: Season): boolean {
  const pin = watchSnapshot;
  return (
    bundle.data_mode === 'real' &&
    season.id === pin.season &&
    bundle.coverage.max_game_date === pin.max_game_date &&
    season.games.length === pin.game_ids.length &&
    season.games.every((g) =>
      (pin.game_ids as readonly string[]).includes(g.id),
    ) &&
    bundle.sources.length === Object.keys(pin.source_hashes).length &&
    Object.entries(pin.source_hashes).every(([kind, hash]) =>
      bundle.sources.some(
        (s) =>
          s.kind === kind &&
          s.hash === hash &&
          s.mapping_status === 'verified' &&
          s.validation_status === 'schema_validated',
      ),
    )
  );
}
