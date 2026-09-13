/**
 * @file genUUID.ts
 * @module domain/utils
*/

import { customAlphabet } from 'nanoid';

/**
 * Generates a prefixed UUID string.
 * @param prefix - The prefix for the ID (e.g., 'user', 'casting').
 * @returns A string in the format '<prefix>-<uuid>'.
 */
export default function genUUID(prefix: string): string {
  // OPC1: Funciona muy bien pero genera un chorizo de 28 ch (sin prefix). Sustituido por Opc-2
  // return `${prefix}-${crypto.randomUUID()}`;

  // OPC2: Genera un id mucho mas corto: 12 ch (con 4 de random)
  // const uid = Date.now().toString(36);  // Len: 8
  // const rnd = Math.random().toString(36).slice(2, 6); // Len: 4
  // return `${prefix}-${formatId(uid+rnd)}`;
  
  // OPC3: Genera un id mas corto: 10 ch (sin riego de colision) >> 3K7n8qP2xL
  const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
  return `${prefix}-${formatId(nanoid())}`; 
}

/**
 * Formatea la entrada como 1234-5678-9012
 * @param id 
 * @returns string ... abcd-efgh-<resto>
 */
function formatId(id: string): string {
  const chunks = id.match(/.{1,4}/g) || [];
  return chunks.join('-');
}

// Número de caracteres aleatorios de la OPC2	
//    Combinaciones posibles	
//                Riesgo de colisión en mismo ms
//--  ---------   ----------------------------------
// 1	       36	  Muy alto (>1 op/ms ya colisiona)
// 2	    1.296	  Aceptable si < 100 ops/ms
// 3	   46.656	  Bueno hasta ~1.000 ops/ms
// 4	1.679.616	  Sobrado para la mayoría de servidores

//-- Query analizadora de los createAt de las tablas ---------------------------
// -- 📈 ¿Cómo interpretar el resultado?
// --     Si percentile_99_ms > 100 → tráfico muy tranquilo (1 ID cada 100 ms o más).
// --     Si percentile_99_ms < 10  → ¡alerta! El 1% de los IDs se generan con menos de 10 ms de separación, es momento de aumentar el random o pasar a microsegundos.
// --     Si min_diff_ms = 0        → dos IDs generados en el mismo milisegundo (colisión segura si no hay random).
// *** En una ejecucion con solo 29 registros, he observado que Participants tiene 
// *** varios registros con el mismo ms 

// WITH combined AS (
//   SELECT createdAt FROM User WHERE createdAt >= date('now', '-1 day') AND createdAt < date('now')
//   UNION ALL
//   SELECT createdAt FROM Round WHERE createdAt >= date('now', '-1 day') AND createdAt < date('now')
//   UNION ALL
//   SELECT createdAt FROM Casting WHERE createdAt >= date('now', '-1 day') AND createdAt < date('now')
//   UNION ALL
//   SELECT createdAt FROM Submission WHERE createdAt >= date('now', '-1 day') AND createdAt < date('now')
//   UNION ALL
//   SELECT createdAt FROM Participant WHERE createdAt >= date('now', '-1 day') AND createdAt < date('now')
//   -- Añade todas las tablas que quieras aquí
// ),
// ordered AS (
//   SELECT createdAt, 
//          LAG(createdAt) OVER (ORDER BY createdAt) AS anterior
//   FROM combined
//   WHERE createdAt IS NOT NULL
// )

