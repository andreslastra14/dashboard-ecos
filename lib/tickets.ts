import type { Caso } from "./firebase";

// No hay tabla `casos` en el backend Postgres actual. La funcionalidad
// de tickets queda inerte para el demo; las UI muestran lista vacía.
export async function getCasos(_estado?: string, _limite = 100): Promise<Caso[]> {
  return [];
}

export async function getCasoStats(): Promise<{
  abiertos: number;
  enProceso: number;
  cerrados: number;
}> {
  return { abiertos: 0, enProceso: 0, cerrados: 0 };
}
