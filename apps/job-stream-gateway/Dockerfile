# Railway: Root Directory = monorepo root (".").
# Dockerfile path = apps/job-stream-gateway/Dockerfile
# Do NOT set Root Directory to apps/job-stream-gateway — context must include all workspaces.

FROM oven/bun:1.2-alpine

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

ENV NODE_ENV=production

CMD ["bun", "run", "--cwd", "apps/job-stream-gateway", "start"]
