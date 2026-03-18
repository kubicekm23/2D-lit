using System.Security.Claims;
using litWebApp.Models;
using litWebApp.Models.DbModels;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace litWebApp.Controllers;

public class AuthController : Controller
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public IActionResult About()
    {
        return View();
    }

    [HttpGet]
    public IActionResult Login()
    {
        if (User.Identity?.IsAuthenticated == true)
            return RedirectToAction("Index", "Home");
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Login(string username, string password)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            ViewBag.Error = "Invalid username or password.";
            return View();
        }

        await SignInUser(user);
        return RedirectToAction("Index", "Home");
    }

    [HttpGet]
    public IActionResult Register()
    {
        if (User.Identity?.IsAuthenticated == true)
            return RedirectToAction("Index", "Home");
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Register(string username, string password, string confirmPassword)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            ViewBag.Error = "Username and password are required.";
            return View();
        }

        if (password != confirmPassword)
        {
            ViewBag.Error = "Passwords do not match.";
            return View();
        }

        if (await _db.Users.AnyAsync(u => u.Username == username))
        {
            ViewBag.Error = "Username already taken.";
            return View();
        }

        // Create user
        var user = new UserModel
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Credits = 10000m
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Give starter ship (Sidewinder, the cheapest)
        var sidewinder = await _db.ShipTypes.FirstAsync(st => st.Price == 0);

        // Pick a random station to spawn at
        var stationCount = await _db.Stations.CountAsync();
        var randomStation = await _db.Stations
            .Skip(new Random().Next(stationCount))
            .FirstAsync();

        var starterShip = new ShipModel
        {
            Name = $"{username}'s Sidewinder",
            UserId = user.Id,
            ShipTypeId = sidewinder.Id,
            MnozstviPaliva = sidewinder.MaxPaliva,
            PositionX = randomStation.CoordinateX,
            PositionY = randomStation.CoordinateY,
            IsActive = true
        };
        _db.Ships.Add(starterShip);
        await _db.SaveChangesAsync();

        // Dock ship at station
        _db.HangarSpots.Add(new HangarSpotModel
        {
            StationId = randomStation.Id,
            ShipId = starterShip.Id
        });

        user.ActiveShipId = starterShip.Id;
        await _db.SaveChangesAsync();

        await SignInUser(user);
        return RedirectToAction("Index", "Home");
    }

    [HttpPost]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Login");
    }

    private async Task SignInUser(UserModel user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
    }
}
