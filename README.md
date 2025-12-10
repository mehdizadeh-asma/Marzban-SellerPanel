# Marzban SellerPanel

Marzban SellerPanel is a split web application: a Next.js + TypeScript frontend and an Express + TypeScript backend. The project provides a seller dashboard for the Marzban platform with typed APIs, reusable UI components, and MongoDB persistence via Mongoose.

## Architecture (high level)

- Frontend: Next.js (app routing) + React + TypeScript. Client-side UI and light business logic live here.
- Backend: Express (or Koa-style bootstrap) + TypeScript. API layer, controllers, services and data-access using Mongoose models.
- Database: MongoDB with Mongoose for schema, models and typed interfaces.

## Folder structure (important paths)

- Frontend/

  - app/ — Next.js app routes and pages (.tsx)
  - components/ — Reusable React components (.tsx)
  - utils/ — Client utilities and helpers (.ts)
  - tsconfig.json, package.json, .eslintrc.json — TypeScript and tool configs

- Backend/

  - src/app.ts — Server bootstrap, middleware and shutdown
  - src/controllers/ — Route handlers / controllers
  - src/services/ or src/utils/ — Business logic and helpers
  - src/models/ — Mongoose schema files and TypeScript interfaces (e.g., Account, Seller, Tariff)
  - src/utils/MongooseModel.ts — model loader helper
  - src/utils/MongooseDbManagement.ts — connection / pooling utilities
  - tsconfig.json, package.json, .eslintrc.json — TypeScript and tool configs

- docker-compose.yaml, nginx.conf, Dockerfiles — orchestration, reverse proxy and container images

## Frontend details (Next.js + TypeScript)

- Pages and routing use Next.js app conventions (app/). Components are .tsx and designed to be small and reusable.
- Types:
  - Prop types and context shapes are defined with TypeScript interfaces/types in .ts/.tsx files.
  - tsconfig.json enforces strictness patterns used across components.
- Typical files:
  - components/Button.tsx — typed props for UI primitives
  - components/layout/\* — header/footer and shared layout
  - utils/api.ts — typed fetch wrappers for backend endpoints (Request/Response DTO types)

## Backend details (Express + TypeScript + Mongoose)

- Server bootstrap:
  - src/app.ts initializes middleware (JSON, CORS), mounts routers, and starts the HTTP server.
- Controllers:
  - Organized per domain (e.g., sellers, accounts). Handlers use typed Request/Response shapes.
- Services / utils:
  - Business logic is separated from route handlers; helpers provide DB access and transformations.
- Models & Types:
  - Mongoose schemas live under src/models with corresponding TypeScript interfaces (IAccount, ISeller, ITariff).
  - getModel helper centralizes model retrieval to avoid re-declaration when hot-reloading or testing.
- TypeScript practices:
  - Use of interfaces for documents, typed RequestHandler signatures, and central config types for environment values.

## Database

- MongoDB is the backing datastore.
- Mongoose is used for:
  - Defining schemas and models
  - Typing documents via interfaces that extend mongoose.Document (or using native TypeScript mappings)
  - Connection management and pooling in src/utils/MongooseDbManagement.ts
- Common models: Account, Seller, Tariff (check src/models/\* for schema details).

## Local development

- Frontend:

  - cd Frontend
  - npm install
  - npm run dev
  - Open http://localhost:3000

- Backend:

  - cd Backend
  - npm install
  - npm run dev (or the script that runs ts-node/ts-node-dev)
  - API port is defined in src/app.ts or environment config

- Docker:
  - docker-compose up --build

## Tests & linting

- Each package contains its own package.json scripts for linting and tests.
- Type checks: run tsc --noEmit in each package to validate types.

## Contributing

- Keep TypeScript types synchronized between models and API DTOs.
- Add or update unit tests for controllers/services when changing behavior.
- Follow existing ESLint and formatting rules in each package.

## Useful files

- Frontend/app/, Frontend/components/, Frontend/tsconfig.json
- Backend/src/app.ts, Backend/src/controllers/, Backend/src/models/, Backend/src/utils/MongooseModel.ts, Backend/src/utils/MongooseDbManagement.ts
- docker-compose.yaml, nginx.conf,
