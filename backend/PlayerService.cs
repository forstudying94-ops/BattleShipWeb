using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace BattleshipWeb;

public class PlayerService(GameDb db)
{
    public async Task<Player> CreateAsync(string rawName)
    {
        var name = NormalizeName(rawName);

        var existing = await db.Players
            .Where(p => p.Name.ToLower() == name.ToLower())
            .OrderBy(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        if (existing is not null)
        {
            existing.LastSeenAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return existing;
        }

        var player = new Player { Name = name };
        db.Players.Add(player);
        await db.SaveChangesAsync();
        return player;
    }

    public async Task<Player?> GetAsync(Guid id) => await db.Players.FindAsync(id);

    static string NormalizeName(string rawName)
    {
        var name = Regex.Replace(rawName ?? "", @"\s+", " ").Trim();
        if (name.Length == 0)
            throw new GameRuleException("Enter a name.");
        if (name.Length > 40)
            name = name[..40].Trim();

        return name;
    }
}
