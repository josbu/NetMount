# NetMount Architecture Documentation

## Overview

NetMount is a unified cloud storage management and mounting application built with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Tauri (Rust)
- **Dependencies**: Rclone, OpenList

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│                    (React Components in src/page)            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Controller Layer                        │
│          (Business logic in src/controller/*)               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│    (Core business services in src/services/*)               │
│  - storage/: Storage management, file operations, transfers  │
│  - ConfigService.ts: Configuration management                │
│  - hook/: Event hooks                                        │
│  - rclone/: Rclone integration                               │
│  - openlist/: OpenList integration                           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Repository Layer                        │
│          (Data access abstraction - Future)                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                    │
│  - utils/rclone/: Rclone API calls                           │
│  - utils/openlist/: OpenList API calls                       │
│  - utils/: Utility functions                                 │
│  - type/: TypeScript type definitions                        │
│  - constants/: Application constants                         │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### Storage Module (`src/services/storage/`)

The storage module has been refactored from a monolithic file into focused sub-modules:

#### StorageManager.ts
Core storage management operations:
- `reupStorage()` - Refresh storage list from rclone/OpenList
- `delStorage()` - Delete a storage
- `getStorageParams()` - Get storage configuration
- `searchStorage()` - Find storage by name
- `filterHideStorage()` - Filter out hidden storages
- `convertStoragePath()` - Convert paths between formats
- `getStorageSpace()` - Get storage capacity info
- `formatPathRclone()` - Format paths for rclone
- `getFileName()` - Extract filename from path

#### FileManager.ts
File operations:
- `getFileList()` - List files in a directory
- `delFile()` - Delete a file
- `delDir()` - Delete a directory
- `mkDir()` - Create a directory
- `uploadFileRequest()` - Upload files with progress

#### TransferService.ts
Transfer operations between storages:
- `copyFile()` - Copy files
- `copyDir()` - Copy directories
- `moveFile()` - Move files
- `moveDir()` - Move directories
- `sync()` - Sync directories (with bisync option)

#### StorageService.ts
Callback registration pattern to avoid circular dependencies:
- `registerDeleteStorage()` - Register delete implementation
- `deleteStorage()` - Call registered delete function

### ConfigService (`src/services/ConfigService.ts`)

Encapsulates global state (`nmConfig`, `osInfo`) with:
- Controlled access via getter/setter methods
- Subscription pattern for config changes
- Type-safe configuration updates
- Callback registration pattern to avoid circular dependencies
- Persistence (load/save to disk)

**Backward Compatibility**: Original exports (`nmConfig`, `osInfo`) still work via getters.

### Repository Layer (`src/repositories/`)

The Repository layer abstracts data access operations, decoupling business logic from data sources:

#### Purpose
- Encapsulate all Tauri invoke calls
- Provide type-safe data access
- Enable caching and retry mechanisms
- Support testing with mock repositories
- Emit data change events

#### BaseRepository (`base/BaseRepository.ts`)
Abstract base class providing:
- `invokeCommand<R>()` - Unified Tauri invoke wrapper with retry and logging
- `clearCache()` - Cache management
- `addChangeListener()` - Data change subscription
- `validate()` - Entity validation helper

#### ConfigRepository (`config/ConfigRepository.ts`)
Configuration data access:
- `getConfig()` - Load full configuration
- `saveConfig()` - Persist configuration
- `updatePartialConfig()` - Merge partial updates
- `getConfigPath()` / `setConfigPath()` - Path-based access
- `getOsInfo()` - Operating system info

#### StorageRepository (`storage/StorageRepository.ts`)
Storage data access:
- `getAll()` - List all storages
- `getById()` - Get specific storage
- `create()` / `update()` / `delete()` - CRUD operations
- `getStorageSpace()` - Storage capacity info
- `getVisibleStorages()` - Filter hidden storages
- `refreshStorageList()` - Sync from Rclone/OpenList

#### Usage Example
```typescript
import { configRepository, storageRepository } from '@/repositories'

// Get configuration
const config = await configRepository.getConfig()

// Update configuration path
await configRepository.setConfigPath('settings.themeMode', 'dark')

// List storages
const storages = await storageRepository.getAll()

// Create storage
await storageRepository.create({
  name: 'my-storage',
  type: 's3',
  framework: 'rclone'
})

// Subscribe to data changes
const unsubscribe = storageRepository.addChangeListener((event) => {
  console.log(`Storage ${event.id} ${event.type}`)
})
```

#### Design Benefits
1. **Testability**: Mock repositories in tests without touching Tauri
2. **Decoupling**: Business logic isolated from data sources
3. **Caching**: Automatic caching with configurable timeout
4. **Logging**: Unified logging via LoggerService
5. **Retry**: Automatic retry on transient failures
6. **Events**: React to data changes in real-time

### Utils Module (`src/utils/`)

Refactored into focused sub-modules:

#### format/
- `formatSize()` - Format file sizes
- `formatETA()` - Format time estimates
- `formatPath()` - Normalize paths

#### string/
- `randomString()` - Generate random strings
- `takeMidStr()` / `takeRightStr()` - String extraction
- `compareVersions()` - Version comparison

#### file/
- `downloadFile()` - File downloads
- `getWinFspInstallState()` / `installWinFsp()` / `openWinFspInstaller()` - WinFsp management
- `openUrlInBrowser()` - Open external URLs
- `showPathInExplorer()` - Open file explorer
- `fs_exist_dir()` / `fs_make_dir()` - Directory operations

#### system/
- `set_devtools_state()` - Toggle devtools
- `restartSelf()` - Restart application
- `sleep()` - Async delay
- `getAvailablePorts()` - Port availability

#### general.ts
- `isEmptyObject()` - Object emptiness check
- `getURLSearchParam()` - URL parsing
- `getProperties()` - Object property extraction
- `mergeObjects()` - Deep object merging

### Constants (`src/constants/index.ts`)

Centralized application constants:
- `THEME_MODES` / `LANGUAGE_OPTIONS` - UI options
- `API_TIMEOUT` - Request timeout settings
- `RETRY_CONFIG` - Retry logic configuration
- `WATCHDOG_CONFIG` - Health check settings
- `STATS_CONFIG` - Statistics refresh intervals
- `UPDATE_CONFIG` - Update check intervals
- `DEFAULT_LANGUAGE` / `FALLBACK_LANGUAGE` - i18n defaults

## Design Patterns

### 1. Circular Dependency Resolution

**Problem**: `utils/rclone/process.ts` imported `delStorage` from `controller/storage/storage.ts`, creating a circular dependency.

**Solution**: Callback registration pattern via `StorageService.ts`:
```typescript
// utils/rclone/process.ts
import { deleteStorage } from '@/services/storage/StorageService'
await deleteStorage(name) // calls registered implementation

// controller/storage/storage.ts
import { registerDeleteStorage } from '@/services/storage/StorageService'
registerDeleteStorage(delStorage)
```

### 2. Global State Encapsulation

**Problem**: `nmConfig`, `rcloneInfo`, `openlistInfo` were exported as mutable objects, allowing any module to modify them.

**Solution**: `ConfigService` class with subscription pattern:
```typescript
// New pattern (recommended)
import { configService } from '@/services/ConfigService'
configService.updateConfig({ settings: { themeMode: 'dark' }})
const unsubscribe = configService.subscribeConfig((new, old) => { ... })

// Backward compatible (still works)
import { nmConfig } from '@/services/config'
nmConfig.settings.themeMode = 'dark' // via getter
```

### 3. Module Re-export Pattern

**Pattern**: New modules export from index, old files re-export for backward compatibility:
```typescript
// src/services/storage/index.ts - New structure
export { reupStorage, delStorage, ... } from './StorageManager'
export { getFileList, delFile, ... } from './FileManager'
export { copyFile, moveFile, ... } from './TransferService'

// src/controller/storage/storage.ts - Backward compatibility
export * from '../../services/storage'
```

## Import Guidelines

### Recommended Imports

Use direct imports to avoid circular dependency warnings:
```typescript
// ✅ Good - Direct import from specific module
import { filterHideStorage } from '@/services/storage/StorageManager'
import { getFileList } from '@/services/storage/FileManager'
import { copyFile } from '@/services/storage/TransferService'

// ⚠️ Avoid - Index imports can cause circular dependency warnings in some cases
import { filterHideStorage, getFileList } from '@/services/storage'
```

### Deprecated Imports (Still Work)
```typescript
// Old path - maintained for backward compatibility
import { filterHideStorage } from '@/controller/storage/storage'
```

## Refactoring Progress

### Completed (P0 - High Priority)
1. ✅ Deleted backup file (`storage.ts.bak`)
2. ✅ Fixed circular dependencies (utils/rclone/process.ts ↔ controller/storage)
3. ✅ Merged duplicate constants files
4. ✅ Extracted magic numbers to named constants
5. ✅ Created ConfigService for state encapsulation
6. ✅ Split storage.ts into 3 focused modules
7. ✅ Split utils.ts into 6 focused modules
8. ✅ Updated imports to use new modular paths

### In Progress (P1 - Medium Priority)
1. ✅ Create Repository layer for data access abstraction (已完成原型)
2. 🔄 Migrate console logs to unified LoggerService
3. ⏳ Update remaining code to use new patterns

### Pending (P2 - Low Priority)
1. ⏳ Add comprehensive unit tests
2. ⏳ Add integration tests
3. ⏳ Performance optimization

## Code Quality Guidelines

### Do's
- ✅ Use named constants instead of magic numbers
- ✅ Import from specific modules for new code
- ✅ Use ConfigService for configuration access
- ✅ Keep modules focused and under 300 lines
- ✅ Use TypeScript strict mode
- ✅ Add JSDoc comments for public APIs

### Don'ts
- ❌ Import mutable state objects directly
- ❌ Create new circular dependencies
- ❌ Mix concerns in a single module
- ❌ Use `any` type
- ❌ Suppress TypeScript errors with `@ts-ignore`

## Testing Strategy

### Unit Tests (Future)
- Test each repository method in isolation
- Mock API calls
- Test edge cases and error handling

### Integration Tests (Future)
- Test component interactions
- Test storage operations end-to-end
- Test configuration persistence

## Migration Notes

### For New Features
1. Import from `@/services/storage/*` directly
2. Use `ConfigService` for configuration
3. Follow the module boundaries

### For Existing Code
- No immediate changes required
- Gradual migration encouraged
- Old imports continue to work

## References

- [Rclone API Documentation](https://rclone.org/commands/)
- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
