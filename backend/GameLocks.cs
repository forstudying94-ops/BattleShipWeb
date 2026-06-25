using System.Collections.Concurrent;

namespace BattleshipWeb;
public class GameLocks
{
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _locks = new();

    public SemaphoreSlim For(Guid gameId) =>
        _locks.GetOrAdd(gameId, _ => new SemaphoreSlim(1, 1));

    public void Drop(Guid gameId) => _locks.TryRemove(gameId, out _);
}
