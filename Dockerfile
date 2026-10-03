FROM node:24.19.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
FROM dependencies AS build
COPY . .
RUN npm run build
FROM dependencies AS runtime-dependencies
RUN npm prune --omit=dev
FROM node:24.19.0-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=runtime-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/db ./db
USER node
EXPOSE 3000
CMD ["sh", "-c", "node --import tsx scripts/validate-env.ts && node --import tsx scripts/migrate.ts && node --import tsx scripts/recover-generation-runs.ts && node server.js"]
