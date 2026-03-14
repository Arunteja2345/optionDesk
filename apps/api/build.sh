#!/bin/bash
# Copy shared types into the api before building
mkdir -p src/_shared
cp ../../packages/shared/src/types.ts src/_shared/types.ts
npm run build
