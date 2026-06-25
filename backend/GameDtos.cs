namespace BattleshipWeb;

public record CreatePlayerRequest(string Name);

public record FleetShipInput(int Size);

public record CreateGameRequest(Guid HostId, int GridSize, List<FleetShipInput> Fleet);

public record JoinGameRequest(Guid PlayerId);

public record PlacedShipInput(int Size, int X, int Y, bool Horizontal);

public record PlaceFleetRequest(Guid PlayerId, List<PlacedShipInput> Ships);

public record FireRequest(Guid PlayerId, int X, int Y);

public record PlayerDto(Guid Id, string DisplayName, int Wins, int Losses, int GamesPlayed);

public record GameCardDto(
 Guid Id,
 Guid HostId,
 string HostName,
 int GridSize,
 int ShipCount,
 int ShipCells,
 string Status,
 DateTime CreatedAt);

public record CellDto(int X, int Y, bool Hit);

public record OwnShipDto(int Size, int X, int Y, bool Horizontal);

public record EnemyShipDto(int Size, bool Sunk);

public record GameStateDto(
 Guid Id,
 int GridSize,
 List<FleetShipInput> Fleet,
 string Status,
 Guid HostId,
 Guid? OpponentId,
 string HostName,
 string? OpponentName,
 bool YouAreHost,
 Guid? TurnPlayerId,
 Guid? WinnerId,
 bool YouPlaced,
 bool OpponentPlaced,
 List<OwnShipDto> MyShips,
 List<CellDto> ShotsByMe,
 List<CellDto> ShotsAtMe,
 List<EnemyShipDto> EnemyFleet);

public record ShotResultDto(
 int X,
 int Y,
 bool Hit,
 int? SunkSize,
 bool Finished,
 Guid? WinnerId,
 Guid? NextTurnPlayerId);
