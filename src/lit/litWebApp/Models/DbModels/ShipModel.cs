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
    public float MnozstviPaliva { get; set; }

    public float PositionX { get; set; }
    public float PositionY { get; set; }
    public float Rotation { get; set; }
    public float VelocityX { get; set; }
    public float VelocityY { get; set; }
    public bool IsActive { get; set; }

    // Navigation
    [ForeignKey(nameof(UserId))]
    public UserModel User { get; set; } = null!;

    [ForeignKey(nameof(ShipTypeId))]
    public ShipTypeModel ShipType { get; set; } = null!;

    public ICollection<CargoModel> Cargos { get; set; } = new List<CargoModel>();

    public HangarSpotModel? HangarSpot { get; set; }
}