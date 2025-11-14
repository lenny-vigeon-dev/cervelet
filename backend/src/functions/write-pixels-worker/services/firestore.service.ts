import { Firestore, Timestamp } from '@google-cloud/firestore';
import { USERS_COLLECTION, CANVAS_COLLECTION, PROJECT_ID } from '../src/config';
import { UserDoc, PixelDoc, PixelPayload } from '../src/types';

/**
 * Service de gestion Firestore pour le write-pixels-worker
 */
export class FirestoreService {
  private db: Firestore;

  constructor() {
    this.db = new Firestore({
      projectId: PROJECT_ID,
    });
  }

  /**
   * Récupère le document utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Le document utilisateur ou null s'il n'existe pas
   */
  async getUser(userId: string): Promise<UserDoc | null> {
    const userRef = this.db.collection(USERS_COLLECTION).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as UserDoc;
  }

  /**
   * Écrit un pixel et met à jour le timestamp de l'utilisateur dans une transaction atomique
   * Cette transaction garantit qu'il n'y a pas de race conditions
   * 
   * @param payload - Les données du pixel à écrire
   * @param newTimestamp - Le nouveau timestamp pour l'utilisateur
   */
  async writePixelTransaction(
    payload: PixelPayload,
    newTimestamp: Timestamp,
  ): Promise<void> {
    const pixelId = `${payload.x}_${payload.y}`;
    const pixelRef = this.db.collection(CANVAS_COLLECTION).doc(pixelId);
    const userRef = this.db.collection(USERS_COLLECTION).doc(payload.userId);

    // Exécution de la transaction pour garantir l'atomicité
    await this.db.runTransaction(async (transaction) => {
      // 1. Écriture du pixel dans la collection canvas
      const pixelData: PixelDoc = {
        color: payload.color,
        userId: payload.userId,
        lastUpdatedAt: newTimestamp,
      };
      transaction.set(pixelRef, pixelData);

      // 2. Mise à jour du timestamp de l'utilisateur
      const userData: UserDoc = {
        lastPixelAt: newTimestamp,
      };
      transaction.set(userRef, userData, { merge: true });
    });
  }

  /**
   * Ferme la connexion Firestore (utile pour les tests)
   */
  async close(): Promise<void> {
    await this.db.terminate();
  }
}
