using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

public class ShipTypeModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = null!;

    public int CargoHold { get; set; }

    [MaxLength(512)]
    public string PathToTextures { get; set; } = null!;

    public int MaxPaliva { get; set; }

    public float MaxSpeed { get; set; }
    public float ThrustPower { get; set; }
    public float FuelEfficiency { get; set; }
    public float TurnRate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [MaxLength(512)]
    public string Description { get; set; } = "";

    // Navigation
    public ICollection<ShipModel> Ships { get; set; } = new List<ShipModel>();
    public ICollection<StationShipStockModel> StationStocks { get; set; } = new List<StationShipStockModel>();
}