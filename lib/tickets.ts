import { getDb, type Caso } from "./firebase";

// Get cases by state
export async function getCasos(estado?: string, limite = 100): Promise<Caso[]> {
  try {
    const db = getDb();
    let q = db.collection("casos").orderBy("fecha_apertura", "desc");
    if (estado) {
      q = db.collection("casos").where("estado", "==", estado).orderBy("fecha_apertura", "desc");
    }
    const snap = await q.limit(limite).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Caso));
  } catch (err) {
    console.error("getCasos failed:", err);
    return [];
  }
}

// Get case stats
export async function getCasoStats(): Promise<{
  abiertos: number;
  enProceso: number;
  cerrados: number;
}> {
  try {
    const db = getDb();
    const [abiertoSnap, procesoSnap, cerradoSnap] = await Promise.all([
      db.collection("casos").where("estado", "==", "Abierto").get(),
      db.collection("casos").where("estado", "==", "En Proceso").get(),
      db.collection("casos").where("estado", "==", "Cerrado").get(),
    ]);
    return {
      abiertos: abiertoSnap.size,
      enProceso: procesoSnap.size,
      cerrados: cerradoSnap.size,
    };
  } catch (err) {
    console.error("getCasoStats failed:", err);
    return { abiertos: 0, enProceso: 0, cerrados: 0 };
  }
}
