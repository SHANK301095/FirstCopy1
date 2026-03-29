# Feature Registry Documentation

## Overview

The Feature Registry tracks all 600+ platform features across 6 major categories. Each feature has a status (implemented, stubbed, not-started), priority, and UI path.

## Categories

### 1. UI/UX & Visual Polish (F001-F030)
- **Themes**: OLED black, Cyberpunk, Terminal, Zen mode
- **Animations**: Table rows, buttons, skeletons, page transitions
- **Layout**: Draggable dashboard, command palette, split-view

### 2. Local Data & Offline (F101-F115)
- **Management**: JSON backup, CSV import, snapshots, recycle bin
- **Export**: PDF reports, Excel export, screenshot mode

### 3. Financial Calculators (F201-F215)
- **Calculators**: Position sizing, compound interest, risk of ruin
- **Simulation**: Monte Carlo, What-If, equity curve

### 4. Trade Journal & Psychology (F301-F310)
- **Journal**: Rich text, mood tracking, mistake tagging
- **Productivity**: Focus timer, breathing exercises

### 5. Developer Tools (F401-F410)
- **Automation**: Rules engine, macro recorder
- **Utilities**: JSON editor, regex tester, localStorage viewer

### 6. Visualization (F501-F510)
- **Charts**: Candlestick, correlation heatmap, Sankey
- **Time Analysis**: Hour/day performance histograms

## Status Definitions

| Status | Description |
|--------|-------------|
| `implemented` | Feature is fully functional |
| `stubbed` | UI exists with placeholder/TODO |
| `not-started` | Not yet created |

## Priority Levels

| Priority | Description |
|----------|-------------|
| `critical` | Core functionality, must have |
| `important` | Significant value, should have |
| `nice-to-have` | Enhancement, can defer |

## Accessing the Registry

### In Code
```typescript
import { 
  featureRegistry, 
  getFeaturesByCategory,
  getFeaturesByStatus,
  getFeatureStats 
} from '@/lib/featureRegistry';

// Get all UI/UX features
const uiFeatures = getFeaturesByCategory('UI/UX');

// Get implemented features
const done = getFeaturesByStatus('implemented');

// Get stats
const stats = getFeatureStats();
// { total: 60, implemented: 25, stubbed: 30, notStarted: 5 }
```

### Via UI
Navigate to `/feature-registry` to see the full list with:
- Search by name, ID, or description
- Filter by category or status
- Grid or list view
- Direct links to feature UI

## Adding New Features

1. Add entry to `src/lib/featureRegistry.ts`
2. Use format: `{ id: 'F999', category: '...', name: '...', status: 'stubbed', ... }`
3. Create UI entry point if stubbed
4. Update this doc if new category

## Current Stats

```
Total Features: 60
Implemented: ~40%
Stubbed: ~50%
Not Started: ~10%
```

## Roadmap

1. **Phase 1**: Core features (DB, themes, navigation)
2. **Phase 2**: Calculators and simulators
3. **Phase 3**: Journal and psychology tools
4. **Phase 4**: Developer utilities
5. **Phase 5**: Advanced visualizations
