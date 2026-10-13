"""Last-known-good publication and raw-download handling."""
import copy
import json
import os
from pathlib import Path
import tempfile
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from .importer import ImportValidationError, build_bundle, utc_now


def atomic_write(bundle: dict, output: str | Path) -> None:
    """Serialize before replacing; failures leave the previous published file intact."""
    payload = json.dumps(bundle, allow_nan=False, ensure_ascii=False, indent=2) + '\n'
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=output.parent, prefix=output.name+'.', suffix='.tmp', delete=False) as handle:
            temp_path = Path(handle.name)
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, output)
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


def refresh(config_path: str | Path, output: str | Path, *, expected_mode: str | None = None) -> dict:
    bundle = build_bundle(config_path)
    if expected_mode is not None and bundle['data_mode'] != expected_mode:
        raise ImportValidationError(f"Expected {expected_mode} data, config selects {bundle['data_mode']}")
    atomic_write(bundle, output)
    return bundle


def download(config_path: str | Path, raw_dir: str | Path, output: str | Path) -> dict:
    """One request per explicitly configured provider download. No sample fallback."""
    config = json.loads(Path(config_path).read_text())
    if config.get('data_mode') != 'real':
        raise ImportValidationError('Download requires data_mode=real')
    config = copy.deepcopy(config)
    raw_dir = Path(raw_dir).resolve()
    raw_dir.mkdir(parents=True, exist_ok=True)
    for kind, spec in config.get('sources', {}).items():
        url = spec.get('url', '')
        parsed = urlparse(url)
        if parsed.scheme != 'https' or parsed.hostname != 'moneypuck.com' or not parsed.path.startswith('/moneypuck/') or not parsed.path.endswith('.csv'):
            raise ImportValidationError(f'{kind}: explicit listed MoneyPuck HTTPS CSV URL required')
        # urllib follows ordinary redirects; no alternate hosts, sessions or retries are used.
        with urlopen(Request(url, headers={'User-Agent':'Leafs-Lab/1.0 (non-commercial data refresh)'}), timeout=45) as response:
            payload = response.read()
        with tempfile.NamedTemporaryFile(dir=raw_dir, prefix=kind+'-', suffix='.csv', delete=False) as handle:
            handle.write(payload)
            spec['path'] = handle.name
        spec['retrieved_at'] = utc_now()
        spec['retrieved_at_basis'] = 'downloaded'
    bundle = build_bundle(config)
    atomic_write(bundle, output)
    return bundle
