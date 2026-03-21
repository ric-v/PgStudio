#!/usr/bin/env bash
# Single ts-mocha process (all unit test files as one argv list) so V8/c8 attributes
# coverage correctly. Do not use: find ... | xargs (may split into multiple runs).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mapfile -t FILES < <(find src/test/unit -maxdepth 1 -name '*.test.ts' ! -name 'PgPassSupport.test.ts' | sort)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "coverage-unit.sh: no unit test files found" >&2
  exit 1
fi

C8_EXTRA=()
# Set COVERAGE_CHECK=0 to skip threshold enforcement (instrumentation smoke only).
if [ "${COVERAGE_CHECK:-1}" = "0" ]; then
  C8_EXTRA+=(--check-coverage=false)
fi

exec npx c8 "${C8_EXTRA[@]}" --config .c8rc.json node ./node_modules/ts-mocha/bin/ts-mocha \
  -p src/test/tsconfig.json \
  -r tsconfig-paths/register \
  -r src/test/setup.ts \
  --exit \
  "${FILES[@]}"
