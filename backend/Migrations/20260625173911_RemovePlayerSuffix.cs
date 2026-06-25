using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BattleshipWeb.Migrations
{
    /// <inheritdoc />
    public partial class RemovePlayerSuffix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Players_Name_Suffix",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "Suffix",
                table: "Players");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Suffix",
                table: "Players",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Players_Name_Suffix",
                table: "Players",
                columns: new[] { "Name", "Suffix" },
                unique: true);
        }
    }
}
