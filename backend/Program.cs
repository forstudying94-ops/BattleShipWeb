using BattleshipWeb;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCors = "frontend";

builder.Services.AddSignalR();

var connection = GetConnectionString(builder.Configuration, builder.Environment);
builder.Services.AddDbContext<GameDb>(o => o.UseNpgsql(connection));

builder.Services.AddSingleton<GameLocks>();
builder.Services.AddScoped<PlayerService>();
builder.Services.AddScoped<GameService>();
builder.Services.AddCors(options =>
 options.AddPolicy(FrontendCors, policy =>
 policy.WithOrigins(ParseOrigins(builder.Configuration)).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

_ = Task.Run(async () => await MigrateWithRetry(app));

app.UseCors(FrontendCors);

app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (GameRuleException ex)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new { message = ex.Message });
    }
});

app.MapPost("/api/players", async (PlayerService players, CreatePlayerRequest req) =>
{
 var player = await players.CreateAsync(req.Name);
 return Results.Ok(MapPlayer(player));
});

app.MapGet("/api/players/{id:guid}", async (PlayerService players, Guid id) =>
{
 var player = await players.GetAsync(id);
 return player is null ? Results.NotFound() : Results.Ok(MapPlayer(player));
});

app.MapGet("/api/games", (GameService games) => games.OpenGamesAsync());

app.MapGet("/api/games/{id:guid}", (GameService games, Guid id) => games.GetCardAsync(id));

app.MapPost("/api/games", async (GameService games, CreateGameRequest req) =>
{
 var game = await games.CreateAsync(req);
 return Results.Ok(new { id = game.Id });
});

app.MapPost("/api/games/{id:guid}/join", async (GameService games, Guid id, JoinGameRequest req) =>
{
 var game = await games.JoinAsync(id, req.PlayerId);
 return Results.Ok(new { id = game.Id });
});

app.MapGet("/api/games/{id:guid}/state", (GameService games, Guid id, Guid playerId) =>
 games.GetStateAsync(id, playerId));

app.MapPost("/api/games/{id:guid}/fleet", async (GameService games, Guid id, PlaceFleetRequest req) =>
{
 await games.PlaceFleetAsync(id, req);
 return Results.NoContent();
});

app.MapPost("/api/games/{id:guid}/fire", (GameService games, Guid id, FireRequest req) =>
 games.FireAsync(id, req));

app.MapHub<GameHub>("/hub");
app.MapGet("/health", () => "ok");
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();

static PlayerDto MapPlayer(Player p) =>
 new(p.Id, p.DisplayName, p.Wins, p.Losses, p.GamesPlayed);

static string[] ParseOrigins(IConfiguration config)
{
 var raw = config["Cors:Origins"];
 if (string.IsNullOrWhiteSpace(raw))
  return ["http://localhost:3000", "http://127.0.0.1:3000"];

 return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

static string GetConnectionString(IConfiguration config, IHostEnvironment env)
{
 var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Default");
 if (string.IsNullOrWhiteSpace(connection))
  connection = Environment.GetEnvironmentVariable("DATABASE_URL");
 if (string.IsNullOrWhiteSpace(connection))
  connection = config.GetConnectionString("Default");
 if (string.IsNullOrWhiteSpace(connection))
 {
  if (env.IsProduction())
   throw new InvalidOperationException("Database connection is not configured.");
  connection = "Host=localhost;Port=5432;Database=battleshipweb;Username=battleshipweb;Password=battleshipweb";
 }

 connection = connection.Trim();
 if (connection.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
  || connection.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
  return ToNpgsqlConnectionString(connection);

 return connection;
}

static string ToNpgsqlConnectionString(string uri)
{
 var parsed = new Uri(uri);
 var userInfo = parsed.UserInfo.Split(':', 2);
 var builder = new NpgsqlConnectionStringBuilder
 {
  Host = parsed.Host,
  Port = parsed.Port > 0 ? parsed.Port : 5432,
  Database = parsed.AbsolutePath.TrimStart('/'),
  Username = Uri.UnescapeDataString(userInfo[0]),
  Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : ""
 };

 foreach (var part in parsed.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
 {
  var kv = part.Split('=', 2);
  if (kv.Length == 2 && kv[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase)
   && Enum.TryParse<SslMode>(kv[1], true, out var mode))
   builder.SslMode = mode;
 }

 return builder.ConnectionString;
}

static async Task MigrateWithRetry(WebApplication app)
{
 using var scope = app.Services.CreateScope();
 var db = scope.ServiceProvider.GetRequiredService<GameDb>();
 var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

 for (var attempt = 1; attempt <= 30; attempt++)
 {
  try
  {
   await db.Database.MigrateAsync();
   log.LogInformation("Database migrations applied.");
   return;
  }
  catch (Exception ex)
  {
   log.LogWarning("Database not ready ({Attempt}/30): {Message}", attempt, ex.Message);
   await Task.Delay(TimeSpan.FromSeconds(3));
  }
 }
 log.LogError("Database did not become ready in time.");
}
