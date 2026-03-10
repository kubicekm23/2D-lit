using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

public class CargoModel
{
    [Key]
    public int Id { get; set; }

    public int ShipId { get; set; }
    public int CargoTypeId { get; set; }
    public int Quantity { get; set; }

    // Navigation
    [ForeignKey(nameof(ShipId))]
    public ShipModel Ship { get; set; } = null!;

    [ForeignKey(nameof(CargoTypeId))]
    public CargoTypeModel CargoType { get; set; } = null!;
}