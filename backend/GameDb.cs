using Microsoft.EntityFrameworkCore;

namespace BattleshipWeb;

public class GameDb(DbContextOptions<GameDb> options) : DbContext(options)
{
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Game> Games => Set<Game>();
    public DbSet<Ship> Ships => Set<Ship>();
    public DbSet<Shot> Shots => Set<Shot>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Player>(p =>
        {
            p.Property(x => x.Name).HasMaxLength(40).IsRequired();
            p.Ignore(x => x.DisplayName);
            p.Ignore(x => x.GamesPlayed);
        });

        model.Entity<Game>(g =>
        {
            g.HasOne(x => x.Host).WithMany().HasForeignKey(x => x.HostId)
                .OnDelete(DeleteBehavior.Restrict);
            g.HasOne(x => x.Opponent).WithMany().HasForeignKey(x => x.OpponentId)
                .OnDelete(DeleteBehavior.Restrict);
            g.HasIndex(x => x.Status);
        });

        model.Entity<Ship>(s =>
        {
            s.HasIndex(x => new { x.GameId, x.OwnerId });
        });

        model.Entity<Shot>(s =>
        {
            s.HasIndex(x => new { x.GameId, x.ShooterId, x.X, x.Y }).IsUnique();
        });
    }
}
