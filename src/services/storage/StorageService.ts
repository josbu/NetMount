import { logger } from '../LoggerService'

/**
 * StorageService - Provides a callback mechanism for storage operations
 * to avoid circular dependencies between utils and controller layers.
 * 
 * This service allows the controller layer to register implementations
 * for storage operations, while the utils layer can call them without
 * directly importing from the controller.
 */

// Type definition for storage delete operation
type DeleteStorageCallback = (name: string) => Promise<void>

// Internal state
let deleteStorageImpl: DeleteStorageCallback | null = null

/**
 * Register the deleteStorage implementation
 * Should be called once during application initialization
 */
export function registerDeleteStorage(callback: DeleteStorageCallback): void {
  if (deleteStorageImpl) {
    logger.warn('deleteStorage callback already registered, overwriting', 'StorageService')
  }
  deleteStorageImpl = callback
}

/**
 * Delete a storage by name
 * This will call the registered implementation
 * 
 * @param name - The name of the storage to delete
 * @throws Error if no implementation is registered
 */
export async function deleteStorage(name: string): Promise<void> {
  if (!deleteStorageImpl) {
    throw new Error(
      'deleteStorage implementation not registered. ' +
      'Make sure to call registerDeleteStorage() during initialization.'
    )
  }
  return deleteStorageImpl(name)
}

/**
 * Check if deleteStorage implementation is registered
 */
export function isDeleteStorageRegistered(): boolean {
  return deleteStorageImpl !== null
}
