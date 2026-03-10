using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

public class ShipModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = null!;

    public int UserId { get; set; }
    public int ShipTypeId { get; set; }
    public int MnozstviPaliva { get; set; }

    // Navigation
    [ForeignKey(nameof(UserId))]
    public UserModel User { get; set; } = null!;

    [ForeignKey(nameof(ShipTypeId))]
    public ShipTypeModel ShipType { get; set; } = null!;

    public ICollection<CargoModel> Cargos { get; set; } = new List<CargoModel>();

    public HangarSpotModel? HangarSpot { get; set; }
}