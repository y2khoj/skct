"""Build browser data from the audited canonical JSON, then verify/rebuild images.

Set SKCT_PDF_PASSWORD before running. This never guesses solution page mappings.
"""
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent
data = json.loads((root / 'data/skct_data.json').read_text(encoding='utf-8'))
(root / 'data/skct_data.js').write_text(
    'const SKCT_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2)
    + ';\nif (typeof module !== "undefined") module.exports = SKCT_DATA;\n', encoding='utf-8')
subprocess.run([sys.executable, str(root / 'verify_mapping.py'), '--repair'], check=True)
