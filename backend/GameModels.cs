namespace BattleshipWeb;

public class Player
{
 public Guid Id { get; set; } = Guid.NewGuid();
 public string Name { get; set; } = "";
 public int Wins { get; set; }
 public int Losses { get; set; }
 public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
 public string DisplayName => Name;
 public int GamesPlayed => Wins + Losses;
}

public class Game
{
 public Guid Id { get; set; } = Guid.NewGuid();
 public Guid HostId { get; set; }
 public Player Host { get; set; } = null!;
 public Guid? OpponentId { get; set; }
 public Player? Opponent { get; set; }
 public int GridSize { get; set; }
 public string Fleet { get; set; } = "[]";
 public GameStatus Status { get; set; } = GameStatus.WaitingForOpponent;
 public Guid? TurnPlayerId { get; set; }
 public Guid? WinnerId { get; set; }
 public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 public DateTime? FinishedAt { get; set; }
 public List<Ship> Ships { get; set; } = new();
 public List<Shot> Shots { get; set; } = new();
}

public class Ship
{
 public Guid Id { get; set; } = Guid.NewGuid();
 public Guid GameId { get; set; }
 public Guid OwnerId { get; set; }
 public string Name { get; set; } = "";
 public int Size { get; set; }
 public int X { get; set; }
 public int Y { get; set; }
 public bool Horizontal { get; set; }

 public IEnumerable<(int X, int Y)> Cells()
 {
  for (var i = 0; i < Size; i++)
   yield return Horizontal ? (X + i, Y) : (X, Y + i);
 }

 public bool Covers(int x, int y) =>
  Horizontal
   ? y == Y && x >= X && x < X + Size
   : x == X && y >= Y && y < Y + Size;
}

public class Shot
{
 public long Id { get; set; }
 public Guid GameId { get; set; }
 public Guid ShooterId { get; set; }
 public int X { get; set; }
 public int Y { get; set; }
 public bool Hit { get; set; }
 public DateTime FiredAt { get; set; } = DateTime.UtcNow;
}

public enum GameStatus
{
 WaitingForOpponent,
 Placing,
 Active,
 Finished
}

public record FleetShip(int Size);
