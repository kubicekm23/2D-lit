using litWebApp.Models.DbModels;
using Microsoft.EntityFrameworkCore;

namespace litWebApp.Models;

public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<UserModel> Users => Set<UserModel>();
        public DbSet<ShipModel> Ships => Set<ShipModel>();
        public DbSet<ShipTypeModel> ShipTypes => Set<ShipTypeModel>();
        public DbSet<CargoModel> Cargos => Set<CargoModel>();
        public DbSet<CargoTypeModel> CargoTypes => Set<CargoTypeModel>();
        public DbSet<StationModel> Stations => Set<StationModel>();
        public DbSet<CargoTypeValueModel> CargoTypeValues => Set<CargoTypeValueModel>();
        public DbSet<HangarSpotModel> HangarSpots => Set<HangarSpotModel>();
        public DbSet<PlanetModel> Planets => Set<PlanetModel>();
        public DbSet<PlanetAffectingStationModel> PlanetAffectingStations => Set<PlanetAffectingStationModel>();
        public DbSet<VisitedStationModel> VisitedStations => Set<VisitedStationModel>();
        public DbSet<StationShipStockModel> StationShipStocks => Set<StationShipStockModel>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ── Composite PKs ──────────────────────────────────

            modelBuilder.Entity<CargoTypeValueModel>()
                .HasKey(e => new { e.CargoTypeId, e.StationId });

            modelBuilder.Entity<HangarSpotModel>()
                .HasKey(e => new { e.StationId, e.ShipId });

            modelBuilder.Entity<PlanetAffectingStationModel>()
                .HasKey(e => new { e.PlanetId, e.StationId });

            modelBuilder.Entity<VisitedStationModel>()
                .HasKey(e => new { e.UserId, e.StationId });

            modelBuilder.Entity<StationShipStockModel>()
                .HasKey(e => new { e.StationId, e.ShipTypeId });

            // ── Relationships ──────────────────────────────────

            // UserModel → Ships  (one-to-many)
            modelBuilder.Entity<ShipModel>()
                .HasOne(s => s.User)
                .WithMany(u => u.Ships)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ShipType → Ships  (one-to-many)
            modelBuilder.Entity<ShipModel>()
                .HasOne(s => s.ShipType)
                .WithMany(st => st.Ships)
                .HasForeignKey(s => s.ShipTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ship → Cargo  (one-to-many)
            modelBuilder.Entity<CargoModel>()
                .HasOne(c => c.Ship)
                .WithMany(s => s.Cargos)
                .HasForeignKey(c => c.ShipId)
                .OnDelete(DeleteBehavior.Cascade);

            // CargoType → Cargo  (one-to-many)
            modelBuilder.Entity<CargoModel>()
                .HasOne(c => c.CargoType)
                .WithMany(ct => ct.Cargos)
                .HasForeignKey(c => c.CargoTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Station → CargoTypeValue  (one-to-many)
            modelBuilder.Entity<CargoTypeValueModel>()
                .HasOne(ctv => ctv.Station)
                .WithMany(s => s.CargoTypeValues)
                .HasForeignKey(ctv => ctv.StationId)
                .OnDelete(DeleteBehavior.Cascade);

            // CargoType → CargoTypeValue  (one-to-many)
            modelBuilder.Entity<CargoTypeValueModel>()
                .HasOne(ctv => ctv.CargoType)
                .WithMany(ct => ct.CargoTypeValues)
                .HasForeignKey(ctv => ctv.CargoTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Station → HangarSpot  (one-to-many)
            modelBuilder.Entity<HangarSpotModel>()
                .HasOne(hs => hs.Station)
                .WithMany(s => s.HangarSpots)
                .HasForeignKey(hs => hs.StationId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ship → HangarSpot  (one-to-zero-or-one)
            modelBuilder.Entity<HangarSpotModel>()
                .HasOne(hs => hs.Ship)
                .WithOne(s => s.HangarSpot)
                .HasForeignKey<HangarSpotModel>(hs => hs.ShipId)
                .OnDelete(DeleteBehavior.Cascade);

            // Planet → CargoType  (many-to-one)
            modelBuilder.Entity<PlanetModel>()
                .HasOne(p => p.CargoType)
                .WithMany(ct => ct.Planets)
                .HasForeignKey(p => p.CargoTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Planet → PlanetAffectingStation  (one-to-many)
            modelBuilder.Entity<PlanetAffectingStationModel>()
                .HasOne(pas => pas.Planet)
                .WithMany(p => p.PlanetAffectingStations)
                .HasForeignKey(pas => pas.PlanetId)
                .OnDelete(DeleteBehavior.Cascade);

            // Station → PlanetAffectingStation  (one-to-many)
            modelBuilder.Entity<PlanetAffectingStationModel>()
                .HasOne(pas => pas.Station)
                .WithMany(s => s.PlanetAffectingStations)
                .HasForeignKey(pas => pas.StationId)
                .OnDelete(DeleteBehavior.Cascade);

            // User → VisitedStation  (one-to-many)
            modelBuilder.Entity<VisitedStationModel>()
                .HasOne(vs => vs.User)
                .WithMany(u => u.VisitedStations)
                .HasForeignKey(vs => vs.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Station → VisitedStation  (one-to-many)
            modelBuilder.Entity<VisitedStationModel>()
                .HasOne(vs => vs.Station)
                .WithMany(s => s.VisitedByUsers)
                .HasForeignKey(vs => vs.StationId)
                .OnDelete(DeleteBehavior.Cascade);

            // Station → StationShipStock  (one-to-many)
            modelBuilder.Entity<StationShipStockModel>()
                .HasOne(ss => ss.Station)
                .WithMany(s => s.ShipStocks)
                .HasForeignKey(ss => ss.StationId)
                .OnDelete(DeleteBehavior.Cascade);

            // ShipType → StationShipStock  (one-to-many)
            modelBuilder.Entity<StationShipStockModel>()
                .HasOne(ss => ss.ShipType)
                .WithMany(st => st.StationStocks)
                .HasForeignKey(ss => ss.ShipTypeId)
                .OnDelete(DeleteBehavior.Cascade);

            // User → ActiveShip  (many-to-one, optional)
            modelBuilder.Entity<UserModel>()
                .HasOne(u => u.ActiveShip)
                .WithMany()
                .HasForeignKey(u => u.ActiveShipId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }