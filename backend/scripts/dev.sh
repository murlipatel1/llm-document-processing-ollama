#!/usr/bin/env sh
set -e

npx prisma generate
npm run dev
