# Leobog Hi86 — SignalRGB Plugin

A [SignalRGB](https://signalrgb.com/) device plugin for the **Leobog Hi86** mechanical keyboard.
Per-key RGB control — all 86 keys — over the wired USB-C connection.

## Requirements

- Windows
- [SignalRGB](https://signalrgb.com/) — the free version is enough (no Pro needed)
- Leobog Hi86 connected via **USB-C cable** (wired mode)

> **Wired only.** Lighting data is carried by a 520-byte HID feature report that only
> exists in wired mode — 2.4 GHz and Bluetooth physically can't carry it.

## Installation

1. Download [`Hi86.js`](./Hi86.js).
2. Copy it into your SignalRGB user plugins folder:

   ```
   <Documents>\WhirlwindFX\Plugins\
   ```

   For most people that's `C:\Users\<you>\Documents\WhirlwindFX\Plugins\` — create the
   folder if it doesn't exist.

   If your Documents folder is **redirected** to another drive, use that real location —
   SignalRGB reads the actual Documents folder, not a hardcoded path.

3. **Fully quit SignalRGB** (tray icon → Exit). Plugins are only scanned at startup.
4. Start SignalRGB — the keyboard now appears in the device list as **Leobog Hi86**.

## Usage

- Connect the keyboard over USB-C.
- Drag **Leobog Hi86** onto the layout and apply any effect — the keyboard lights up per
  key, matching the canvas.
- Device settings: **Lighting Mode** switches between `Canvas` (follows the layout) and
  `Forced` (single fixed color chosen via **Forced Color**).

## Troubleshooting

- **Device doesn't appear** — make sure the keyboard is in wired mode, the file is in the
  real Documents folder, and SignalRGB was fully restarted.
- **Lights don't react** — close the official Leobog software (`OemDrv.exe`). While it
  runs, the plugin intentionally stays out of the way: both drive the same vendor channel.

## Notes

- When SignalRGB isn't driving it, the keyboard shows its own onboard effect again (the
  firmware redraws it about a second after frames stop).
- The plugin only writes live lighting data — stored lighting profiles on the keyboard are
  left untouched.
- Tested with SignalRGB 2.5.80 on Windows, October 2026.

## Credits

The packet format was cross-checked byte-for-byte against two independent implementations:

- [OpenRGB](https://openrgb.org/) — `SinowealthKeyboard10cController`
- **NollieL/SignalRgb_CN_Key** — community SignalRGB plugin for the Leobog Hi75