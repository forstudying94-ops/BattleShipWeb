using Microsoft.AspNetCore.SignalR;

namespace BattleshipWeb;

public class GameHub : Hub
{
    public const string Lobby = "lobby";

    public static string GameGroup(Guid gameId) => $"game:{gameId}";

    public Task JoinLobby() => Groups.AddToGroupAsync(Context.ConnectionId, Lobby);

    public Task LeaveLobby() => Groups.RemoveFromGroupAsync(Context.ConnectionId, Lobby);

    public Task JoinGame(Guid gameId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GameGroup(gameId));

    public Task LeaveGame(Guid gameId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GameGroup(gameId));
}
