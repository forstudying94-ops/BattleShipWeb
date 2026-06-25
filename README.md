# BattleshipWeb

Online Battleship for two players. No registration, just a nickname.

## Stack

- `backend/` - ASP.NET Core, PostgreSQL, SignalR
- `frontend/` - Vite, React, TypeScript

## Run locally

You need .NET 10 SDK, Node 20+, Docker.

```bash
docker compose up -d db
cd backend && dotnet run
cd frontend && npm install && npm run dev
```

Open http://localhost:3000. Backend runs on http://localhost:5204.

Or everything in Docker:

```bash
docker compose up --build
```
