#!/usr/bin/env bash
# Same as coverage:unit but does not fail on global thresholds (verify c8 attribution only).
set -euo pipefail
export COVERAGE_CHECK=0
exec bash "$(dirname "$0")/coverage-unit.sh"
