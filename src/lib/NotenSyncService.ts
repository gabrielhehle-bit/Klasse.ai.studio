/**
 * Global Data Synchronization Service for Grade Changes
 * Handles pub-sub events for immediate state syncing across different modules
 * such as the Gradebook, Diagnostic Dashboard, and Statistics view.
 */

type NotenSyncCallback = (event: { type: string; timestamp: number }) => void;

class NotenSyncService {
  private listeners: Set<NotenSyncCallback> = new Set();

  /**
   * Register a subscriber callback to receive change notifications.
   * Returns a function to unsubscribe.
   */
  public subscribe(callback: NotenSyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Broadcast a synchronization event when grades, participation, or other assessment data changes.
   */
  public broadcastUpdate(type: 'note' | 'mitarbeit' | 'settings' | 'general' = 'general') {
    const event = {
      type,
      timestamp: Date.now()
    };
    
    // Notify React context and subscribers
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (err) {
        console.error('[NotenSyncService] Error in listener callback:', err);
      }
    });

    // Fire standard CustomEvent on window for non-React or global handlers
    window.dispatchEvent(new CustomEvent('app-noten-changed', { detail: event }));
    console.log(`[NotenSyncService] Dispatched global '${type}' update event to ${this.listeners.size} subscribers.`);
  }
}

export const notenSyncService = new NotenSyncService();
