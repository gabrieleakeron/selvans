# Multi-stage build per selvans-angular-demo
# Contesto di build: root del monorepo (come la Python demo).
#
# Stage 1 (builder) — installa le dipendenze pnpm e builda il bundle Angular (production).
# Stage 2 (runtime) — nginx:alpine serve il bundle statico con SPA fallback.
#
# NOTA: la demo Angular non ha un package.json proprio; usa il root workspace.
# Il Core URL viene risolto lato browser (window.__Selvans_CORE_URL__ ?? http://localhost:8080),
# quindi il container si limita a servire file statici — non ha bisogno di raggiungere
# il Core via rete Docker.

# ---- Stage 1: build ----
FROM node:22-alpine AS builder

# Installa pnpm (stesso package manager del monorepo)
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Copia i manifest prima per sfruttare il layer cache di Docker.
# pnpm-lock.yaml deve essere presente: --frozen-lockfile (riga successiva) lo richiede.
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./

# Copia i package.json delle librerie workspace che servono alla build
COPY packages/selvans-angular/package.json ./packages/selvans-angular/

# Installa le dipendenze (onlyBuiltDependencies definito in pnpm-workspace.yaml)
RUN pnpm install --frozen-lockfile

# Copia i sorgenti necessari alla build Angular
COPY packages/selvans-angular/ ./packages/selvans-angular/
COPY demos/selvans-angular-demo/ ./demos/selvans-angular-demo/
COPY nx.json ./
COPY tsconfig.base.json* ./

# Build production della demo Angular
# Output: dist/demos/selvans-angular-demo/browser (Angular 20+ con build-angular)
RUN pnpm exec nx build selvans-angular-demo --configuration=production

# ---- Stage 2: serve ----
FROM nginx:alpine AS runtime

# Rimuovi la configurazione nginx di default
RUN rm /etc/nginx/conf.d/default.conf

# Configurazione nginx con SPA fallback
COPY demos/selvans-angular-demo/nginx.conf /etc/nginx/conf.d/default.conf

# Copia il bundle statico dal builder
COPY --from=builder /app/dist/demos/selvans-angular-demo/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
