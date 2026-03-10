using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

/// <summary>Composite PK: (CargoTypeId, StationId)</summary>
public class CargoTypeValueModel
{
    public int CargoTypeId { get; set; }
    public int StationId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Value { get; set; }

    // Navigation
    [ForeignKey(nameof(CargoTypeId))]
    public CargoTypeModel CargoType { get; set; } = null!;

    [ForeignKey(nameof(StationId))]
    public StationModel Station { get; set; } = null!;
}