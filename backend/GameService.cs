using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BattleshipWeb;

public class GameService(GameDb db, IHubContext<GameHub> hub, GameLocks locks)
{
    public const int MinGrid = 6;
    public const int MaxGrid = 16;
    public const int MaxShipSize = 7;

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };
    public async Task<Game> CreateAsync(CreateGameRequest req)
    {
        var host = await db.Players.FindAsync(req.HostId)
            ?? throw new GameRuleException("Unknown player.");

        if (req.GridSize < MinGrid || req.GridSize > MaxGrid)
            throw new GameRuleException($"Grid size must be between {MinGrid} and {MaxGrid}.");

        var fleet = NormalizeFleet(req.Fleet, req.GridSize);

        var game = new Game
        {
            HostId = host.Id,
            GridSize = req.GridSize,
            Fleet = JsonSerializer.Serialize(fleet, Json),
            Status = GameStatus.WaitingForOpponent
        };
        db.Games.Add(game);
        await db.SaveChangesAsync();

        await LobbyChanged();
        return game;
    }

    public async Task<List<GameCardDto>> OpenGamesAsync()
    {
        var games = await db.Games
            .Where(g => g.Status == GameStatus.WaitingForOpponent)
            .Include(g => g.Host)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        return games.Select(g =>
        {
            var fleet = ReadFleet(g.Fleet);
            return new GameCardDto(
                g.Id, g.HostId, g.Host.DisplayName, g.GridSize,
                fleet.Count, fleet.Sum(s => s.Size),
                g.Status.ToString(), g.CreatedAt);
        }).ToList();
    }

    public async Task<GameCardDto> GetCardAsync(Guid gameId)
    {
        var g = await db.Games.Include(x => x.Host).FirstOrDefaultAsync(x => x.Id == gameId)
            ?? throw new GameRuleException("Game not found.");
        var fleet = ReadFleet(g.Fleet);
        return new GameCardDto(
            g.Id, g.HostId, g.Host.DisplayName, g.GridSize,
            fleet.Count, fleet.Sum(s => s.Size), g.Status.ToString(), g.CreatedAt);
    }

    public async Task<Game> JoinAsync(Guid gameId, Guid playerId)
    {
        var game = await db.Games.FindAsync(gameId)
            ?? throw new GameRuleException("Game not found.");
        var player = await db.Players.FindAsync(playerId)
            ?? throw new GameRuleException("Unknown player.");

        if (game.HostId == playerId)
            throw new GameRuleException("You can't join your own game.");
        if (game.Status != GameStatus.WaitingForOpponent || game.OpponentId is not null)
            throw new GameRuleException("This game is no longer open.");

        game.OpponentId = player.Id;
        game.Status = GameStatus.Placing;
        await db.SaveChangesAsync();

        await GameChanged(game.Id);
        await LobbyChanged();
        return game;
    }
    public async Task PlaceFleetAsync(Guid gameId, PlaceFleetRequest req)
    {
        var sem = locks.For(gameId);
        await sem.WaitAsync();
        try
        {
            var game = await db.Games.FindAsync(gameId)
                ?? throw new GameRuleException("Game not found.");

            if (game.Status != GameStatus.Placing)
                throw new GameRuleException("Ships can only be placed before the battle starts.");
            if (req.PlayerId != game.HostId && req.PlayerId != game.OpponentId)
                throw new GameRuleException("You are not part of this game.");

            var alreadyPlaced = await db.Ships.AnyAsync(s => s.GameId == gameId && s.OwnerId == req.PlayerId);
            if (alreadyPlaced)
                throw new GameRuleException("You already placed your fleet.");

            var fleet = ReadFleet(game.Fleet);
            var ships = ValidatePlacement(req.Ships, fleet, game.GridSize, gameId, req.PlayerId);
            db.Ships.AddRange(ships);
            var otherId = req.PlayerId == game.HostId ? game.OpponentId!.Value : game.HostId;
            var bothReady = await db.Ships.AnyAsync(s => s.GameId == gameId && s.OwnerId == otherId);

            if (bothReady)
            {
                game.Status = GameStatus.Active;
                game.TurnPlayerId = game.HostId;
            }

            await db.SaveChangesAsync();
            await GameChanged(game.Id);
        }
        finally
        {
            sem.Release();
        }
    }

    public async Task<ShotResultDto> FireAsync(Guid gameId, FireRequest req)
    {
        var sem = locks.For(gameId);
        await sem.WaitAsync();
        try
        {
            var game = await db.Games.FindAsync(gameId)
                ?? throw new GameRuleException("Game not found.");

            if (game.Status != GameStatus.Active)
                throw new GameRuleException("The battle isn't running.");
            if (game.TurnPlayerId != req.PlayerId)
                throw new GameRuleException("It's not your turn.");
            if (req.X < 0 || req.Y < 0 || req.X >= game.GridSize || req.Y >= game.GridSize)
                throw new GameRuleException("That shot is off the board.");

            var defenderId = req.PlayerId == game.HostId ? game.OpponentId!.Value : game.HostId;

            var repeat = await db.Shots.AnyAsync(s =>
                s.GameId == gameId && s.ShooterId == req.PlayerId && s.X == req.X && s.Y == req.Y);
            if (repeat)
                throw new GameRuleException("You already fired at that cell.");

            var defenderShips = await db.Ships
                .Where(s => s.GameId == gameId && s.OwnerId == defenderId)
                .ToListAsync();

            var hitShip = defenderShips.FirstOrDefault(s => s.Covers(req.X, req.Y));
            var hit = hitShip is not null;

            db.Shots.Add(new Shot
            {
                GameId = gameId,
                ShooterId = req.PlayerId,
                X = req.X,
                Y = req.Y,
                Hit = hit
            });

            var hits = await db.Shots
                .Where(s => s.GameId == gameId && s.ShooterId == req.PlayerId && s.Hit)
                .Select(s => new { s.X, s.Y })
                .ToListAsync();
            var hitCells = hits.Select(h => (h.X, h.Y)).Append((req.X, req.Y)).ToHashSet();

            int? sunk = null;
            if (hitShip is not null && hitShip.Cells().All(hitCells.Contains))
                sunk = hitShip.Size;

            var finished = defenderShips.SelectMany(s => s.Cells()).All(hitCells.Contains);

            Guid? nextTurn;
            if (finished)
            {
                game.Status = GameStatus.Finished;
                game.WinnerId = req.PlayerId;
                game.TurnPlayerId = null;
                game.FinishedAt = DateTime.UtcNow;
                nextTurn = null;

                var winner = await db.Players.FindAsync(req.PlayerId);
                var loser = await db.Players.FindAsync(defenderId);
                if (winner is not null) winner.Wins++;
                if (loser is not null) loser.Losses++;
            }
            else
            {
                nextTurn = hit ? req.PlayerId : defenderId;
                game.TurnPlayerId = nextTurn;
            }

            await db.SaveChangesAsync();

            var result = new ShotResultDto(req.X, req.Y, hit, sunk, finished, game.WinnerId, nextTurn);
            await GameChanged(gameId);
            if (finished)
            {
                await LobbyChanged();
                locks.Drop(gameId);
            }
            return result;
        }
        finally
        {
            sem.Release();
        }
    }
    public async Task<GameStateDto> GetStateAsync(Guid gameId, Guid playerId)
    {
        var game = await db.Games
            .Include(g => g.Host)
            .Include(g => g.Opponent)
            .FirstOrDefaultAsync(g => g.Id == gameId)
            ?? throw new GameRuleException("Game not found.");

        if (playerId != game.HostId && playerId != game.OpponentId)
            throw new GameRuleException("You are not part of this game.");

        var ships = await db.Ships.Where(s => s.GameId == gameId).ToListAsync();
        var shots = await db.Shots.Where(s => s.GameId == gameId).OrderBy(s => s.Id).ToListAsync();

        var youAreHost = playerId == game.HostId;
        var opponentId = youAreHost ? game.OpponentId : game.HostId;

        var myShips = ships.Where(s => s.OwnerId == playerId)
            .Select(s => new OwnShipDto(s.Size, s.X, s.Y, s.Horizontal))
            .ToList();

        var shotsByMe = shots.Where(s => s.ShooterId == playerId)
            .Select(s => new CellDto(s.X, s.Y, s.Hit)).ToList();
        var shotsAtMe = opponentId is null
            ? new List<CellDto>()
            : shots.Where(s => s.ShooterId == opponentId).Select(s => new CellDto(s.X, s.Y, s.Hit)).ToList();

        var myHitCells = shots.Where(s => s.ShooterId == playerId && s.Hit)
            .Select(s => (s.X, s.Y)).ToHashSet();
        var enemyFleet = (opponentId is null ? new List<Ship>() : ships.Where(s => s.OwnerId == opponentId))
            .Select(s => new EnemyShipDto(s.Size, s.Cells().All(myHitCells.Contains)))
            .ToList();

        return new GameStateDto(
            game.Id,
            game.GridSize,
            ReadFleet(game.Fleet).Select(f => new FleetShipInput(f.Size)).ToList(),
            game.Status.ToString(),
            game.HostId,
            game.OpponentId,
            game.Host.DisplayName,
            game.Opponent?.DisplayName,
            youAreHost,
            game.TurnPlayerId,
            game.WinnerId,
            ships.Any(s => s.OwnerId == playerId),
            opponentId is not null && ships.Any(s => s.OwnerId == opponentId),
            myShips,
            shotsByMe,
            shotsAtMe,
            enemyFleet);
    }

    private List<Ship> ValidatePlacement(
        List<PlacedShipInput> placed, List<FleetShip> fleet, int grid, Guid gameId, Guid ownerId)
    {
        if (placed is null || placed.Count != fleet.Count)
            throw new GameRuleException("Wrong ship count.");

        var wanted = fleet.Select(s => s.Size).OrderBy(s => s).ToList();
        var got = placed.Select(s => s.Size).OrderBy(s => s).ToList();
        if (!wanted.SequenceEqual(got))
            throw new GameRuleException("Wrong ship sizes.");

        var taken = new HashSet<(int, int)>();
        var ships = new List<Ship>();
        foreach (var p in placed)
        {
            var ship = new Ship
            {
                GameId = gameId,
                OwnerId = ownerId,
                Name = "",
                Size = p.Size,
                X = p.X,
                Y = p.Y,
                Horizontal = p.Horizontal
            };

            foreach (var (cx, cy) in ship.Cells())
            {
                if (cx < 0 || cy < 0 || cx >= grid || cy >= grid)
                    throw new GameRuleException("Ship is outside the board.");
                if (!taken.Add((cx, cy)))
                    throw new GameRuleException("Ships overlap.");
            }
            ships.Add(ship);
        }
        return ships;
    }

    private static List<FleetShip> NormalizeFleet(List<FleetShipInput>? input, int grid)
    {
        if (input is null || input.Count == 0)
            throw new GameRuleException("Add at least one ship to the fleet.");
        if (input.Count > 12)
            throw new GameRuleException("That's too many ships for one game.");

        var fleet = new List<FleetShip>();
        foreach (var s in input)
        {
            var maxSize = Math.Min(grid, MaxShipSize);
            if (s.Size < 1 || s.Size > maxSize)
                throw new GameRuleException($"Ship size must be between 1 and {maxSize}.");
            fleet.Add(new FleetShip(s.Size));
        }

        var cells = fleet.Sum(f => f.Size);
        if (cells > grid * grid * 0.6)
            throw new GameRuleException("Fleet is too big for this board.");

        return fleet;
    }

    private static List<FleetShip> ReadFleet(string json) =>
        JsonSerializer.Deserialize<List<FleetShip>>(json, Json) ?? new();

    private Task GameChanged(Guid gameId) =>
        hub.Clients.Group(GameHub.GameGroup(gameId)).SendAsync("GameUpdated", new { gameId });

    private Task LobbyChanged() =>
        hub.Clients.Group(GameHub.Lobby).SendAsync("LobbyUpdated");
}
