using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

public class UserModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Username { get; set; } = null!;

    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Credits { get; set; }

    public int? ActiveShipId { get; set; }

    // Navigation
    [ForeignKey(nameof(ActiveShipId))]
    public ShipModel? ActiveShip { get; set; }

    public ICollection<ShipModel> Ships { get; set; } = new List<ShipModel>();
    public ICollection<VisitedStationModel> VisitedStations { get; set; } = new List<VisitedStationModel>();
}