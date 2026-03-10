using litWebApp.Models;
using litWebApp.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

namespace litWebApp;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllersWithViews();

        var connectionString = GetConnectionString(builder.Configuration);
        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.LoginPath = "/Auth/Login";
                options.LogoutPath = "/Auth/Logout";
            });

        var app = builder.Build();

        // Apply migrations and seed data
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            await SeedDataService.SeedAsync(db);
            await WorldGenerationService.GenerateWorldAsync(db);
        }

        // Configure the HTTP request pipeline.
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler("/Home/Error");
            app.UseHsts();
        }

        app.UseRouting();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapStaticAssets();
        app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}")
            .WithStaticAssets();

        app.Run();
    }

    private static string GetConnectionString(IConfiguration config)
    {
        // 1. Try DATABASE_URL (postgres://user:pass@host:port/db)
        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (!string.IsNullOrEmpty(databaseUrl))
        {
            var uri = new Uri(databaseUrl);
            var userInfo = uri.UserInfo.Split(':');
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');
            var username = userInfo[0];
            var password = userInfo.Length > 1 ? userInfo[1] : "";
            return $"Host={host};Port={port};Database={database};Username={username};Password={password}";
        }

        // 2. Try standard ConnectionStrings:DefaultConnection
        var connStr = config.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrEmpty(connStr))
            return connStr;

        throw new InvalidOperationException(
            "No database connection configured. Set DATABASE_URL environment variable " +
            "or ConnectionStrings__DefaultConnection.");
    }
}