# Showdown

A two-player isometric board game for Android, built to switch between themes (graphics, sound and words).

A .NET 10 Android app that shows the game (`App1/Assets`, plain JavaScript and Phaser 2) in a WebView.

## Status

- **Done:** the app (`com.harriercarrier.futurecitybattle`), landscape
- **Done:** the theme engine: graphics, sounds and words come from a theme (see `App1/Assets/README.md`)
- **Done:** the first theme, **Future City Battle** (cyberpunk: Enforcers vs Neon Gangs), every graphic and sound made in code, in a blocky toy style
- **Done:** the app icon, drawn in code (`tools/make-icons.js`)

## Layout

| Path | What |
|---|---|
| `App1/Assets` | The game: `index.html`, `js/`, `assets/` (Phaser 2 and the isometric plugin, no build step) |
| `App1/MainActivity.cs` | The WebView that loads `file:///android_asset/index.html` |
| `App1/Showdown.csproj` | App id, version, and which files in `Assets` are left out of the app |
| `build-release.ps1` | Builds the signed `.aab` for Google Play (reads the upload key from Azure Key Vault) |

## Playing it online

Live on GitHub Pages: https://wizzard262.github.io/future-city-battle/. Pages serves the `gh-pages` branch, which holds only `App1/Assets`. After pushing `main`, publish the game with:

```
git subtree push --prefix App1/Assets origin gh-pages
```

## Running the game in a browser

In `App1/Assets`, run:

```
python -m http.server 8765
```

Then open http://localhost:8765/index.html

## Building the app

Needs .NET 10 with the `android` workload, the Android SDK and JDK 21 (same as Harrier Carrier Android).

```
dotnet build App1\Showdown.csproj
```

## Before the first Google Play upload

- Bump `ApplicationVersion` in `App1/Showdown.csproj` for every upload
