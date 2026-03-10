using System.ComponentModel.DataAnnotations;

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

    // Navigation
    public ICollection<ShipModel> Ships { get; set; } = new List<ShipModel>();
}