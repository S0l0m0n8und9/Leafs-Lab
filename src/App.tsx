import { useEffect, useState } from 'react';
import type { Bundle } from './data.js';
import type { Route, View } from './route.js';
import { changeRoute, parseRoute, routeHash, subscribeRoute } from './route.js';
import { SourceMeta, Empty } from './components/common.js';
import Watch from './views/Watch.js';
import Games from './views/Games.js';
import Players from './views/Players.js';
import Trends from './views/Trends.js';
import Methodology from './views/Methodology.js';
import MetricHelp from './components/MetricHelp.js';
const views: { id: View; label: string }[] = [
  { id: 'watch', label: 'Watch guide' },
  { id: 'games', label: 'Games' },
  { id: 'players', label: 'Player form' },
  { id: 'trends', label: 'Season trends' },
  { id: 'methodology', label: 'How to read it' },
];
export default function App({
  bundle,
  initialRoute,
}: {
  bundle: Bundle;
  initialRoute?: Route;
}) {
  const [route, setRoute] = useState(
    () =>
      initialRoute ??
      parseRoute(
        typeof window === 'undefined' ? '' : window.location.hash,
        bundle,
      ),
  );
  const [linkStatus, setLinkStatus] = useState('');
  useEffect(
    () =>
      subscribeRoute(window, () =>
        setRoute(parseRoute(window.location.hash, bundle)),
      ),
    [bundle],
  );
  const update = (changes: Partial<Route>) => {
    const next = changeRoute(route, changes, bundle),
      hash = routeHash(next);
    setRoute(next);
    setLinkStatus('');
    if (window.location.hash !== hash) window.location.hash = hash;
  };
  const season = bundle.seasons.find((s) => s.id === route.season);
  const fallback = route.fallbackSeason;
  const old = bundle.sources.some(
    (s) => Date.now() - Date.parse(s.retrieved_at) > 48 * 3600000,
  );
  const shareLink = async () => {
    const url = new URL(window.location.href);
    url.hash = routeHash(route);
    try {
      await navigator.clipboard.writeText(url.href);
      setLinkStatus('Link copied');
    } catch {
      setLinkStatus('Copy the address bar URL to share this view.');
    }
  };
  return (
    <>
      <a
        className="skip-link"
        href="#content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('content')?.focus();
        }}
      >
        Skip to content
      </a>
      {bundle.data_mode === 'sample' && (
        <div className="sample-banner" role="note">
          <span className="sample-dot" aria-hidden="true" />
          <p>
            <strong>
              Sample data — illustrative games and players, not actual NHL
              results.
            </strong>{' '}
            <span>Fictional players · demonstration mode</span>
          </p>
        </div>
      )}
      <header className="site-header">
        <div className="masthead">
          <a className="brand" href={routeHash({ ...route, view: 'watch' })}>
            <span className="brand-mark" aria-hidden="true">
              LL
              <span />
            </span>
            <span>
              Leafs Lab<small>THE TORONTO HOCKEY LAB</small>
            </span>
          </a>
          <div className="edition">
            <span>INDEPENDENT FAN ANALYSIS</span>
            <strong>Numbers with perspective.</strong>
          </div>
        </div>
        <div className="nav-row">
          <nav aria-label="Main navigation">
            {views.map((v) => (
              <a
                key={v.id}
                href={routeHash({ ...route, view: v.id })}
                aria-current={route.view === v.id ? 'page' : undefined}
              >
                {v.label}
              </a>
            ))}
          </nav>
          <button className="share-button" onClick={shareLink}>
            Share view <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>
      <div className="site-body">
        <div className="shared-controls">
          <label>
            Season
            <select
              value={route.season}
              disabled={!season}
              onChange={(e) => {
                const target = bundle.seasons.find(
                  (s) => s.id === e.target.value,
                );
                update({
                  season: e.target.value,
                  game: target?.games.at(-1)?.id ?? '',
                  player: '',
                });
              }}
            >
              {bundle.seasons.length ? (
                bundle.seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {!s.games.length ? ' · No games' : ''}
                  </option>
                ))
              ) : (
                <option>No seasons</option>
              )}
            </select>
          </label>
          {route.view !== 'watch' && (
            <fieldset>
              <legend>Strength</legend>
              <div className="segmented strength-switch">
                <button
                  aria-pressed={route.strength === '5on5'}
                  onClick={() => update({ strength: '5on5' })}
                >
                  5-on-5
                </button>
                <button
                  aria-pressed={route.strength === 'all'}
                  onClick={() => update({ strength: 'all' })}
                >
                  All strengths
                </button>
              </div>
            </fieldset>
          )}
          <p className="snapshot-state">
            <span
              className={'status-dot' + (old ? ' old' : '')}
              aria-hidden="true"
            />
            {old ? 'Old snapshot (>48h)' : 'Snapshot available'}
            <small>
              {bundle.data_mode === 'sample'
                ? 'Sample coverage'
                : 'File-derived coverage'}
            </small>
          </p>
        </div>
        {linkStatus && (
          <p className="link-status" role="status">
            {linkStatus}
          </p>
        )}
        {fallback && (
          <p className="fallback-note" role="status">
            The requested season has no available games. Showing the latest
            populated season: {season?.label ?? 'none available'}.
          </p>
        )}
        <main id="content" tabIndex={-1} key={route.view}>
          {route.view !== 'methodology' && <MetricHelp view={route.view} />}
          {route.view === 'methodology' ? (
            <Methodology bundle={bundle} />
          ) : !season ? (
            <>
              <h1>No seasons available</h1>
              <Empty>
                This snapshot has no completed team games. Check Methodology for
                coverage and provenance.
              </Empty>
            </>
          ) : route.view === 'watch' ? (
            <Watch bundle={bundle} season={season} route={route} />
          ) : route.view === 'games' ? (
            <Games
              bundle={bundle}
              season={season}
              route={route}
              update={update}
            />
          ) : route.view === 'players' ? (
            <Players
              bundle={bundle}
              season={season}
              route={route}
              update={update}
            />
          ) : (
            <Trends bundle={bundle} season={season} route={route} />
          )}
        </main>
        <footer className="site-footer">
          <div>
            <strong>Leafs Lab</strong>
            <p>
              An independent hockey lab. A little less scoreboard watching, a
              little more perspective.
            </p>
          </div>
          <SourceMeta bundle={bundle} compact />
          <p className="footer-note">
            Non-commercial fan project · No official affiliation
          </p>
        </footer>
      </div>
    </>
  );
}
