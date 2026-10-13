# Task 1 implementation and self-review report

## Result and owned changes

Implemented schema-v1 export, explicit CSV adapters, pure metric helpers, sample/local-real/download CLI modes, and last-known-good atomic publication. Only pipeline/, tests/test_metrics.py, tests/test_importer.py, fixtures/, public/data/leafs-lab.json, docs/data-contract.md, docs/source-validation.md, requirements.txt and this report belong to this task. No frontend, Sites or GitHub mutations were made.

The frozen contract includes separate all/5on5 stats, nullable metrics, all-strength scoreboard/result, player appearance arrays, source hashes/retrieval times/schema status/mapping verification and discovered coverage. Canonical IDs normalize short and full game IDs safely; source IDs and dates must match regular-season year/type. TOR/opponent pairing, header mappings, CSV widths, units, finite non-negative values, integer counts, duplicate/conflicting keys, cross-strength metadata, goalie shot identity and orphan joins are checked.

Scores before shootout may remain tied and result null. Final scoreboard imports require separate score columns so analytical GF/GA can exclude shootout goals. Zero denominators and incomplete aggregate samples yield null. Samples/windows use team games and a nonoverlapping baseline, with eligibility thresholds pinned in tests. The frontend owns rolling/window rendering and summaries from raw exported stats.

## Sample evidence

Two illustrative seasons, each with 24 team games, 279 TOR skater appearances and 24 goalie appearances; fictional names, both strengths, varied/tied results, missing xG, zero xG and zero-time cameo, short samples and another-team rows filtered from a traded player. Skater scoring is allocated within team goals and individual xG is scaled to team xG when known. Coverage ends 2025-12-16, strictly illustrative; data_mode remains sample. Fixtures import through the same adapters and export path used by local real CSVs. Fixture config has null source URLs and explicit sample provenance.

## Source access and material limitations

Controller's direct request for the listed all_teams.csv returned HTTP 403 on 12 October 2026. No repeated request or bypass was attempted by this task. Live source headers/rows remain unavailable. Candidate MoneyPuck headers are unverified and recorded as such in config/docs; the skater/goalie game-level URLs are unresolved and left null rather than substituting summary datasets. Any real source can be configured by exact mapping columns, situations, units, game-type values and URLs without code changes. Local real import is supported; accepted real coverage still requires dictionary/header review and spot checks of three TOR games and three player rows.

DuckDB and pytest are absent. Standard-library CSV/unittest execution works; requirements.txt retains optional DuckDB and docs describe extending it without changing semantics. No daily scheduler or automatic hosted updates were installed. Fetch failures and invalid refresh preserve the previous snapshot without silently switching to samples.

## TDD and verification

Tests preceded implementation. The initial importable stubs returned missing results: the complete RED run recorded 14 tests, 6 expected assertion failures and 8 errors from absent output fields/types. These errors are explicitly retained as incomplete-contract evidence rather than presented as clean assertion RED. A second RED after core implementation added date/type/opponent and final-score protection: 17 tests, two expected assertion failures and one not-yet-created fixture error. Both protections were then implemented and fixtures supplied.

Focused commands passed: `python3 -m unittest discover -s tests -p 'test_metrics.py' -v` (5 tests), `python3 -m unittest discover -s tests -p 'test_importer.py' -v` (12 tests). Full suite passed with 17 tests. `python3 -m pipeline sample` published two seasons/48 games through the canonical path. Strict JSON parsing/serialization with allow_nan=False passed; identical fixed-timestamp inputs produced byte-equivalent object values. Atomic invalid-refresh and NaN serialization preservation are asserted in tests. `git diff --check` passed. The fixture scoring plausibility cleanup was followed by another full suite and sample export.

## Self-review

Reviewed all task-owned code against the brief and spec: no strength blending, no player-name joins, no mean-of-percentage aggregates, no team-derived goalie GSAx, no tied-score winner, no missing-to-zero coercion, no current/historical coverage fabrication, no implicit real→sample fallback. Download writes raw files before validation, then replaces only a validated/strictly serialized bundle. Source mapping status is surfaced; retrieval time is preserved from explicit config or local CSV mtime and never inferred from rebuild time. Game/season/appearance ordering is deterministic. The remaining real-data acceptance blocker and optional DuckDB deferral are documented.

## Retained RED output

```
test_bad_schema_and_invalid_numbers_fail (test_importer.ImporterTests.test_bad_schema_and_invalid_numbers_fail) ... FAIL
test_duplicates_deduplicate_and_conflicts_fail (test_importer.ImporterTests.test_duplicates_deduplicate_and_conflicts_fail) ... ERROR
test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback (test_importer.ImporterTests.test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback) ... FAIL
test_missing_stays_null_and_minutes_convert (test_importer.ImporterTests.test_missing_stays_null_and_minutes_convert) ... ERROR
test_normalized_ids_match_across_sources (test_importer.ImporterTests.test_normalized_ids_match_across_sources) ... FAIL
test_regular_season_tor_only_and_orphans_rejected (test_importer.ImporterTests.test_regular_season_tor_only_and_orphans_rejected) ... ERROR
test_sample_export_has_two_seasons_and_24_games_each (test_importer.ImporterTests.test_sample_export_has_two_seasons_and_24_games_each) ... FAIL
test_strengths_are_not_added (test_importer.ImporterTests.test_strengths_are_not_added) ... ERROR
test_tied_preshootout_scores_do_not_infer_win (test_importer.ImporterTests.test_tied_preshootout_scores_do_not_infer_win) ... ERROR
test_finishing_and_verdict_thresholds (test_metrics.MetricsTests.test_finishing_and_verdict_thresholds) ... FAIL
test_hand_calculations (test_metrics.MetricsTests.test_hand_calculations) ... ERROR
test_missing_and_zero (test_metrics.MetricsTests.test_missing_and_zero) ... ERROR
test_ratio_of_sums_and_strict_missing (test_metrics.MetricsTests.test_ratio_of_sums_and_strict_missing) ... ERROR
test_windows_use_team_games_and_nonoverlapping_baseline (test_metrics.MetricsTests.test_windows_use_team_games_and_nonoverlapping_baseline) ... FAIL

======================================================================
ERROR: test_duplicates_deduplicate_and_conflicts_fail (test_importer.ImporterTests.test_duplicates_deduplicate_and_conflicts_fail)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 53, in test_duplicates_deduplicate_and_conflicts_fail
    self.assertEqual(len(build_bundle(self.config(teams=[self.team, self.team]))['seasons'][0]['games']), 1)
                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^
IndexError: list index out of range

======================================================================
ERROR: test_missing_stays_null_and_minutes_convert (test_importer.ImporterTests.test_missing_stays_null_and_minutes_convert)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 60, in test_missing_stays_null_and_minutes_convert
    stats = build_bundle(config)['seasons'][0]['skaters'][0]['stats']['all']
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^
IndexError: list index out of range

======================================================================
ERROR: test_regular_season_tor_only_and_orphans_rejected (test_importer.ImporterTests.test_regular_season_tor_only_and_orphans_rejected)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 73, in test_regular_season_tor_only_and_orphans_rejected
    self.assertEqual(len(bundle['seasons'][0]['games']),1)
                         ~~~~~~~~~~~~~~~~~^^^
IndexError: list index out of range

======================================================================
ERROR: test_strengths_are_not_added (test_importer.ImporterTests.test_strengths_are_not_added)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 48, in test_strengths_are_not_added
    stats = build_bundle(self.config(teams=[self.team, five]))['seasons'][0]['games'][0]['stats']
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^
IndexError: list index out of range

======================================================================
ERROR: test_tied_preshootout_scores_do_not_infer_win (test_importer.ImporterTests.test_tied_preshootout_scores_do_not_infer_win)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 42, in test_tied_preshootout_scores_do_not_infer_win
    game = build_bundle(self.config())['seasons'][0]['games'][0]
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^
IndexError: list index out of range

======================================================================
ERROR: test_hand_calculations (test_metrics.MetricsTests.test_hand_calculations)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_metrics.py", line 6, in test_hand_calculations
    self.assertAlmostEqual(xg_share(3.5, 1.9), 64.8148148148)
  File "/opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/unittest/case.py", line 916, in assertAlmostEqual
    diff = abs(first - second)
               ~~~~~~^~~~~~~~
TypeError: unsupported operand type(s) for -: 'NoneType' and 'float'

======================================================================
ERROR: test_missing_and_zero (test_metrics.MetricsTests.test_missing_and_zero)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_metrics.py", line 17, in test_missing_and_zero
    self.assertIsNone(aggregate([{'goals': 1, 'ixg': None}])['finishing_difference'])
                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^
KeyError: 'finishing_difference'

======================================================================
ERROR: test_ratio_of_sums_and_strict_missing (test_metrics.MetricsTests.test_ratio_of_sums_and_strict_missing)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_metrics.py", line 21, in test_ratio_of_sums_and_strict_missing
    self.assertAlmostEqual(aggregate(rows)['xg_share'], 100 * 9 / 11)
                           ~~~~~~~~~~~~~~~^^^^^^^^^^^^
KeyError: 'xg_share'

======================================================================
FAIL: test_bad_schema_and_invalid_numbers_fail (test_importer.ImporterTests.test_bad_schema_and_invalid_numbers_fail)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 65, in test_bad_schema_and_invalid_numbers_fail
    with self.assertRaisesRegex(ImportValidationError, 'column'):
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: ImportValidationError not raised

======================================================================
FAIL: test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback (test_importer.ImporterTests.test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 80, in test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback
    with self.assertRaises(ImportValidationError): refresh(config_path, target)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: ImportValidationError not raised

======================================================================
FAIL: test_normalized_ids_match_across_sources (test_importer.ImporterTests.test_normalized_ids_match_across_sources)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 35, in test_normalized_ids_match_across_sources
    self.assertEqual(normalize_game_id('20001', '20232024'), '2023020001')
AssertionError: None != '2023020001'

======================================================================
FAIL: test_sample_export_has_two_seasons_and_24_games_each (test_importer.ImporterTests.test_sample_export_has_two_seasons_and_24_games_each)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 87, in test_sample_export_has_two_seasons_and_24_games_each
    self.assertEqual(bundle['data_mode'],'sample'); self.assertEqual(len(bundle['seasons']),2)
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: None != 'sample'

======================================================================
FAIL: test_finishing_and_verdict_thresholds (test_metrics.MetricsTests.test_finishing_and_verdict_thresholds)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_metrics.py", line 25, in test_finishing_and_verdict_thresholds
    self.assertEqual(finishing_label(2, 5, 3600), 'Finishing above expectation')
AssertionError: None != 'Finishing above expectation'

======================================================================
FAIL: test_windows_use_team_games_and_nonoverlapping_baseline (test_metrics.MetricsTests.test_windows_use_team_games_and_nonoverlapping_baseline)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_metrics.py", line 38, in test_windows_use_team_games_and_nonoverlapping_baseline
    self.assertEqual([g['id'] for g in current], ['20', '21', '22', '23', '24'])
AssertionError: Lists differ: [] != ['20', '21', '22', '23', '24']

Second list contains 5 additional elements.
First extra element 0:
'20'

- []
+ ['20', '21', '22', '23', '24']

----------------------------------------------------------------------
Ran 14 tests in 0.005s

FAILED (failures=6, errors=8)
```

## Latest GREEN output

```
test_bad_schema_and_invalid_numbers_fail (test_importer.ImporterTests.test_bad_schema_and_invalid_numbers_fail) ... ok
test_date_year_and_game_id_type_must_match_season (test_importer.ImporterTests.test_date_year_and_game_id_type_must_match_season) ... ok
test_duplicates_deduplicate_and_conflicts_fail (test_importer.ImporterTests.test_duplicates_deduplicate_and_conflicts_fail) ... ok
test_explicit_compact_date_and_game_type_from_id (test_importer.ImporterTests.test_explicit_compact_date_and_game_type_from_id) ... ok
test_final_score_requires_separate_score_columns (test_importer.ImporterTests.test_final_score_requires_separate_score_columns) ... ok
test_full_ids_stay_full_and_wrong_year_fails (test_importer.ImporterTests.test_full_ids_stay_full_and_wrong_year_fails) ... ok
test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback (test_importer.ImporterTests.test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback) ... ok
test_missing_stays_null_and_minutes_convert (test_importer.ImporterTests.test_missing_stays_null_and_minutes_convert) ... ok
test_normalized_ids_match_across_sources (test_importer.ImporterTests.test_normalized_ids_match_across_sources) ... ok
test_regular_season_tor_only_and_orphans_rejected (test_importer.ImporterTests.test_regular_season_tor_only_and_orphans_rejected) ... ok
test_sample_export_has_two_seasons_and_24_games_each (test_importer.ImporterTests.test_sample_export_has_two_seasons_and_24_games_each) ... ok
test_strengths_are_not_added (test_importer.ImporterTests.test_strengths_are_not_added) ... ok
test_tied_preshootout_scores_do_not_infer_win (test_importer.ImporterTests.test_tied_preshootout_scores_do_not_infer_win) ... ok
test_finishing_and_verdict_thresholds (test_metrics.MetricsTests.test_finishing_and_verdict_thresholds) ... ok
test_hand_calculations (test_metrics.MetricsTests.test_hand_calculations) ... ok
test_missing_and_zero (test_metrics.MetricsTests.test_missing_and_zero) ... ok
test_ratio_of_sums_and_strict_missing (test_metrics.MetricsTests.test_ratio_of_sums_and_strict_missing) ... ok
test_windows_use_team_games_and_nonoverlapping_baseline (test_metrics.MetricsTests.test_windows_use_team_games_and_nonoverlapping_baseline) ... ok

----------------------------------------------------------------------
Ran 18 tests in 0.037s

OK
```

## Final source-format check

Controller noted provider starting-year seasons, YYYYMMDD dates and absent game-type columns. Added a test first, observed RED (`ImportValidationError: missing game_type mapping`), then implemented explicit `date_format: YYYYMMDD` and `game_type_from_id: true`; canonical output remains unchanged. Candidate config uses these explicit options. Focused importer suite now passes 13 tests, complete suite passes 18 tests; sample export still passes. No further source fetching was attempted.

```
test_bad_schema_and_invalid_numbers_fail (test_importer.ImporterTests.test_bad_schema_and_invalid_numbers_fail) ... ok
test_date_year_and_game_id_type_must_match_season (test_importer.ImporterTests.test_date_year_and_game_id_type_must_match_season) ... ok
test_duplicates_deduplicate_and_conflicts_fail (test_importer.ImporterTests.test_duplicates_deduplicate_and_conflicts_fail) ... ok
test_explicit_compact_date_and_game_type_from_id (test_importer.ImporterTests.test_explicit_compact_date_and_game_type_from_id) ... ERROR
test_final_score_requires_separate_score_columns (test_importer.ImporterTests.test_final_score_requires_separate_score_columns) ... ok
test_full_ids_stay_full_and_wrong_year_fails (test_importer.ImporterTests.test_full_ids_stay_full_and_wrong_year_fails) ... ok
test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback (test_importer.ImporterTests.test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback) ... ok
test_missing_stays_null_and_minutes_convert (test_importer.ImporterTests.test_missing_stays_null_and_minutes_convert) ... ok
test_normalized_ids_match_across_sources (test_importer.ImporterTests.test_normalized_ids_match_across_sources) ... ok
test_regular_season_tor_only_and_orphans_rejected (test_importer.ImporterTests.test_regular_season_tor_only_and_orphans_rejected) ... ok
test_sample_export_has_two_seasons_and_24_games_each (test_importer.ImporterTests.test_sample_export_has_two_seasons_and_24_games_each) ... ok
test_strengths_are_not_added (test_importer.ImporterTests.test_strengths_are_not_added) ... ok
test_tied_preshootout_scores_do_not_infer_win (test_importer.ImporterTests.test_tied_preshootout_scores_do_not_infer_win) ... ok

======================================================================
ERROR: test_explicit_compact_date_and_game_type_from_id (test_importer.ImporterTests.test_explicit_compact_date_and_game_type_from_id)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/sites/leafs-lab/tests/test_importer.py", line 92, in test_explicit_compact_date_and_game_type_from_id
    game = build_bundle(config)['seasons'][0]['games'][0]
           ^^^^^^^^^^^^^^^^^^^^
  File "/workspace/sites/leafs-lab/pipeline/importer.py", line 189, in build_bundle
    rows, source = _read_rows(kind, spec, base)
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/workspace/sites/leafs-lab/pipeline/importer.py", line 82, in _read_rows
    raise ImportValidationError(f'{kind}: missing required column mappings: {sorted(missing)}')
pipeline.importer.ImportValidationError: teams: missing required column mappings: ['game_type']

----------------------------------------------------------------------
Ran 13 tests in 0.032s

FAILED (errors=1)
```

## Line-ending correction

The first staged diff check reported CSV CRLF line endings as trailing whitespace. Normalized fixture CSVs to LF and regenerated source hashes; reran full tests/export and staged diff verification before the follow-up commit. The earlier unstaged check had not included untracked files. No analytical values changed.

## Fix round 1: final-score aliases and timestamp provenance

Final-score imports now reject `score_for`/`score_against` mappings that reuse either analytical `gf`/`ga` source header or each other. Distinct source columns still allow a final 3–2 score alongside analytical 2–2 goals. Every exported source now has `retrieved_at_basis`: an explicit configured timestamp defaults to `declared_retrieval`, a fresh pipeline download records `downloaded`, and otherwise the CSV's modification time records `local_mtime`. A rebuild of unchanged inputs preserves timestamp and basis. The download path overrides stale configured timestamps and bases with its new fetch time. The sample snapshot was regenerated through the importer and remains `data_mode=sample`, with three declared fixture timestamps; `generated_at` alone advanced.

Provider directory listing verified the 2025 regular-season TOR game-level skater/goalie URL paths now in candidate config. No CSV request was made in this fix round; their raw mappings and data remain unverified, and that single season does not cover all requested seasons.

RED before implementation: `python3 -m unittest discover -s tests -p 'test_importer.py' -v` ran 17 tests and failed with five alias subtest failures and two missing `retrieved_at_basis` errors. After implementation, the same focused command ran 18 tests, **OK**. `python3 -m pipeline sample` published **2 sample seasons, 48 games**, through 2025-12-16. `python3 -m unittest discover -s tests -v` ran **23 tests, OK**. Strict `json.loads(..., parse_constant=reject)` followed by `json.dumps(..., allow_nan=False)` passed; all three sample sources expose `declared_retrieval`. `git diff --check` passed. These tests use local mocked download responses and do not verify provider headers or actual game data.
