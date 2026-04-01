# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Pac-Man Runner plugin** for UlanziDeck stream deck devices. The plugin implements a playable Pac-Man game across a 3x5 grid of physical keys, with automatic position detection and a lucky blessing word system.

## Key Commands

### Deploy Plugin
```bash
# Windows: Copy plugin to UlanziStudio plugins directory
.\deploy.bat

# Manual deployment
xcopy "com.ulanzi.pacman.ulanziPlugin" "C:\Users\%USERNAME%\AppData\Roaming\Ulanzi\UlanziDeck\Plugins\com.ulanzi.pacman.ulanziPlugin\" /E /I /Y /Q
```

### Generate Icons
```bash
# Regenerate all plugin icons (icon.png, categoryIcon.png, actionIcon.png)
python generate_icons.py
```

### Testing
- Deploy the plugin using the script above
- Restart UlanziStudio desktop application
- Drag 13-15 "Pac-Man Runner" actions to a 3x5 key grid
- Game starts automatically when enough keys are placed

## Architecture

### Core Design Pattern: Zero-Configuration Single Action

The plugin uses **automatic position detection** via the UlanziDeck SDK's `key` parameter instead of manual configuration:

```javascript
// SDK provides key in "col_row" format (e.g., "0_0", "3_1")
const decoded = $UD.decodeContext(context);
const key = decoded.key;  // "3_1" means column 3, row 1

// Auto-assign role based on position
function parseKeyRole(key) {
  const [col, row] = key.split('_').map(Number);

  if (col <= 2 && row <= 2) return { role: 'game', col, row };
  if (key === '3_0') return { role: 'blessing', index: 0 };
  if (key === '4_0') return { role: 'blessing', index: 1 };
  // ... etc
}
```

**Layout**:
- Columns 0-2, Rows 0-2 → Game area (3x3 grid where Pac-Man moves)
- Positions (3,0), (4,0), (3,1), (4,1) → Blessing display (4 characters)

### Three-Layer Architecture

1. **GameEngine** (`plugin/actions/GameEngine.js`)
   - Pure game logic: Pac-Man movement, pathfinding, dot eating, special effects
   - Manhattan distance pathfinding with randomization (70% optimal, 30% random)
   - Lucky dot system with 3 special effects (rainbow, flash, big)
   - 80 lucky blessing phrases (Chinese auspicious 4-character idioms)
   - State machine: normal → waiting for respawn → normal

2. **RenderManager** (`plugin/actions/RenderManager.js`)
   - Renders full game scene to a large canvas (3x3 cells × 144px = 432×432px)
   - Splits canvas into individual 144×144px blocks for each key
   - **Performance optimization**: Only updates cells near Pac-Man, not all cells
   - Two rendering modes:
     - `splitAllBlocks()`: Full refresh (initial render, dot respawn)
     - `splitToBlocks()`: Incremental (only Pac-Man's current + previous position)

3. **Main Service** (`plugin/app.js`)
   - WebSocket communication via `$UD` SDK API
   - Context mapping: Maps SDK contexts to grid positions
   - Game loop: 8 FPS (125ms interval) via `setInterval`
   - Event handling: onAdd (drag key), onRun (click key), onClear (remove key)

### Critical Data Format

**IMPORTANT**: RenderManager expects `{row, col}` format, NOT `{col, row}`:

```javascript
// CORRECT
gameCells[context] = { row: keyInfo.row, col: keyInfo.col };

// WRONG - will cause rendering to fail
gameCells[context] = { col: keyInfo.col, row: keyInfo.row };
```

This is because the rendering logic uses `position.row` and `position.col` to index arrays and calculate pixel offsets.

### Game Loop Flow

```
setInterval(125ms) →
  gameEngine.update() →
    movePacman() / eat dots / trigger effects

  renderManager.renderFullScene(gameState) →
    draw background / grid / dots / pacman on full canvas

  IF dots just respawned:
    renderManager.splitAllBlocks() → update ALL cells
  ELSE:
    renderManager.splitToBlocks() → update only changed cells

  $UD.setBaseDataIcon(context, base64) → send to UlanziStudio
```

### Immediate Rendering on Add

When a key is dragged to the grid (`onAdd` event), the plugin immediately renders that specific cell:

```javascript
$UD.onAdd(jsn => {
  // ... parse position ...

  if (gameEngine && renderManager) {
    // Render full scene
    renderManager.renderFullScene(gameEngine.getState());

    // Split ONLY this one cell
    const singleCellMap = { [context]: { row, col } };
    const blocks = renderManager.splitAllBlocks(singleCellMap);

    // Display immediately
    $UD.setBaseDataIcon(context, blocks[context]);
  }
});
```

This ensures users see content immediately when adding keys, not just after the game starts.

## UUID Naming Convention

UlanziDeck plugins **must follow strict UUID rules**:

```
Plugin UUID:  com.ulanzi.ulanzistudio.{plugin}          (4 segments)
Action UUID:  com.ulanzi.ulanzistudio.{plugin}.{action} (5+ segments)

Example:
Plugin:       com.ulanzi.ulanzistudio.pacman
Action:       com.ulanzi.ulanzistudio.pacman.runner
```

The UUID is used in three places:
1. `manifest.json` → "UUID" field (plugin) and "Actions[].UUID" (action)
2. `app.js` → `$UD.connect('com.ulanzi.ulanzistudio.pacman')`
3. Plugin folder name: `com.ulanzi.{plugin}.ulanziPlugin`

## Critical Logging

Use SDK logging, NOT console methods:

```javascript
// CORRECT
$UD.logMessage('Game started', 'info');
$UD.logMessage('Error: ' + err.message, 'error');

// WRONG - won't appear in log files
console.log('Game started');
console.warn('Error');
```

Log files location: `%APPDATA%\Ulanzi\UlanziDeck\logs\`

## Icon Generation

The `generate_icons.py` script uses PIL (Python Imaging Library) to programmatically generate all three required icons:

- `icon.png` (144×144): Plugin main icon
- `categoryIcon.png` (196×196): Category icon
- `actionIcon.png` (40×40): Action list icon

All use classic arcade Pac-Man style with golden yellow (#FFD700) on dark blue background (#0a0e27).

## File Structure

```
com.ulanzi.pacman.ulanziPlugin/
├── manifest.json              # Plugin metadata + Action definitions
├── plugin/
│   ├── app.html               # HTML entry point (loads SDK + app.js)
│   ├── app.js                 # Main service: WebSocket events, game loop
│   └── actions/
│       ├── GameEngine.js      # Game logic layer
│       └── RenderManager.js   # Rendering layer
├── assets/icons/              # Generated icons
├── libs/                      # UlanziDeck SDK (copied from demo)
└── zh_CN.json, en.json        # i18n files
```

**Note**: This plugin has NO `property-inspector/` folder because it uses zero-configuration design.

## SDK Reference

The plugin uses the UlanziDeck JavaScript SDK (`libs/js/ulanziApi.js`):

- `$UD.connect(uuid)` - Connect to UlanziStudio
- `$UD.onAdd(callback)` - Key added event
- `$UD.onRun(callback)` - Key pressed event
- `$UD.setBaseDataIcon(context, base64Data)` - Update key display
- `$UD.decodeContext(context)` - Extract {uuid, key, actionid}
- `$UD.logMessage(msg, level)` - Write to log file

Full SDK documentation: `G:/projects/UlanziDeckPlugin-SDK/README.zh.md`

## Performance Considerations

1. **8 FPS game loop** (125ms interval) - Slow enough for smooth animation without communication bottleneck
2. **Incremental rendering** - Only update 1-2 cells per frame during normal gameplay
3. **Canvas reuse** - Preallocate cell canvases, don't recreate every frame
4. **Full refresh triggers**:
   - Initial game start (all cells)
   - Dot respawn after eating all dots (all cells)
   - Each new key added (that one cell only)

## Submission

To submit to UlanziDeck Marketplace:

1. Email `ustudioservice@ulanzi.com` with:
   - Plugin zip file (`com.ulanzi.pacman.ulanziPlugin.zip`)
   - `SUBMISSION.md` document
   - Use `SUBMISSION_EMAIL.md` as template

2. Optional: Post on official forum https://bbs.ulanzistudio.com for community feedback first
