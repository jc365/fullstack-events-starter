# Plan de ejecución - Flecos de pulido

## Resumen ejecutivo

- Total de tareas: 18
- Secuenciales (mismo archivo): 5 archivos diferentes → 5 flujos paralelos
- Paralelizables: 4 subagentes simultáneos
- Subagentes recomendados: 4
- Estimación: 3-4 horas (con paralelismo: ~1.5 horas reales)

### Mapa de dependencias

```
Tarea 16 (eliminar participante) ──→ requiere endpoint backend nuevo
                                    (DELETE /rounds/:roundId/participants/:userId)

Tarea 18 (scoring unificado) ──→ SIN dependencias, paralelizable con todas
                                 (no comparte lógica con Tarea 14)
```

### Archivos afectados por tarea

| Tarea | Archivo(s) |
|-------|-----------|
| 1 | `Layout.tsx` |
| 2 | `Layout.tsx` |
| 3 | `Layout.tsx` |
| 4 | `Dashboard.tsx` |
| 5 | `Dashboard.tsx` |
| 6 | `Dashboard.tsx` |
| 7 | `CastingDetail.tsx` |
| 8 | `CastingDetail.tsx` |
| 9 | `RoundDetail.tsx` |
| 10 | `RoundDetail.tsx` (SubmissionCard) |
| 11 | `RoundDetail.tsx` (SubmissionCard) |
| 12 | `RoundDetail.tsx` (SubmissionCard) |
| 13 | `RoundDetail.tsx` (SubmissionCard) |
| 14 | `RoundDetail.tsx` (SubmissionCard) |
| 15 | `RoundDetail.tsx` + `ConfirmDialog.tsx` |
| 16 | `RoundDetail.tsx` + backend `routes.ts` |
| 17 | `VideoPlayerModal.tsx` |
| 18 | `RoundDetail.tsx`, `VideoPlayerModal.tsx`, `Dashboard.tsx` |

---

## Estrategia de paralelización

| Subagente | Tareas asignadas | Archivos | Justificación |
|-----------|------------------|----------|---------------|
| **A: Layout** | 1, 2, 3 | `Layout.tsx` | 3 tareas en el mismo archivo, secuenciales. Tarea 3 (logout) toca `handleLogout` que interactúa con el estado del toggle de tareas 1-2. |
| **B: Dashboard** | 4, 5, 6 | `Dashboard.tsx` | 3 tareas en el mismo archivo, secuenciales. Todas son independientes de otros archivos. |
| **C: CastingDetail** | 7, 8 | `CastingDetail.tsx` | 2 tareas en el mismo archivo. Tarea 8 requiere fetch de submissions por round (nuevo dato). |
| **D: RoundDetail + VideoPlayer + Cross** | 9, 10, 11, 12, 13, 14, 15, 16, 17, 18 | `RoundDetail.tsx`, `VideoPlayerModal.tsx`, `backend/routes.ts` | El mayor volumen. 9-16 son todas en `RoundDetail.tsx` (SubmissionCard). 17 en `VideoPlayerModal.tsx`. 18 requiere tocar ambos archivos + `Dashboard.tsx`. **Tarea 18 puede ejecutarse al inicio ya que es independiente de 14.** |

> **Nota sobre Tarea 18**: Aunque toca `Dashboard.tsx` (subagente B), los cambios en Dashboard son cosméticos (formato de estrellas) y se pueden aplicar al final sin conflicto, ya que el subagente B ya habrá terminado. Tarea 18 no depende de Tarea 14 — comparten archivos pero no lógica.

---

## Fase 1: Independientes (paralelo total)

Las 4 tareas de esta fase NO tienen dependencias entre sí y pueden ejecutarse simultáneamente.

---

### Subagente A: Layout.tsx (Tareas 1, 2, 3)

#### Tarea 1: Retirar usuario del header
- **Archivos**: `Layout.tsx`
- **Ubicación**: Líneas 238-248 (bloque `{user && (...)}`)
- **Complejidad**: Fácil
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con B, C, D)
- **Detalle**: Eliminar el bloque completo `{user && (...)}` del header. El usuario ya se muestra en la sidebar. El header solo queda con el badge de demo y los botones (tarea 2 elimina los botones).
- **Cambio**: Eliminar líneas 238-248 completamente.

#### Tarea 2: Retirar iconos de campana y engranaje
- **Archivos**: `Layout.tsx`
- **Ubicación**: Líneas 226-237 (dos botones `button`)
- **Complejidad**: Fácil
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con B, C, D)
- **Detalle**: Eliminar los dos `<button>` de notifications y settings. Son funcionalidad placeholder que se añadirá después.
- **Cambio**: Eliminar líneas 226-237 completamente.

#### Tarea 3: Desactivar toggle-demo al hacer logout
- **Archivos**: `Layout.tsx`
- **Ubicación**: Línea 75 (`handleLogout`)
- **Complejidad**: Fácil
- **Dependencias**: Tareas 1 y 2 (mismo archivo, pero sin conflicto de líneas)
- **Paralelizable**: Sí (con B, C, D), pero secuencial con 1 y 2
- **Detalle**: Añadir `setDemoEnabled(false)` en `handleLogout`. Actualmente solo limpia localStorage y refresca el contexto. El toggle visual queda en estado "on" hasta que el usuario lo desactive manualmente.
- **Cambio**:
  ```tsx
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setDemoEnabled(false);  // ← añadir
    refreshUser();
  };
  ```

---

### Subagente B: Dashboard.tsx (Tareas 4, 5, 6)

#### Tarea 4: Destacar títulos de tarjetas
- **Archivos**: `Dashboard.tsx`
- **Ubicación**: Líneas 278, 303, 329 (títulos h3 de cada sección)
- **Complejidad**: Fácil
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con A, C, D)
- **Detalle**: Añadir estilo `font-semibold text-on-surface` a los h3 de cada tarjeta de gráfico. Actualmente usan `font-headline-sm text-headline-sm text-on-surface-variant`.
- **Cambio** (aplicar a las 3 líneas):
  ```tsx
  // Cambiar de
  <h3 className="font-headline-sm text-headline-sm text-on-surface-variant">
  // A
  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
  ```

#### Tarea 5: Submissions per Round - label completo + barra fina
- **Archivos**: `Dashboard.tsx`
- **Ubicación**: Línea 286 (contenedor de barra), líneas 280-284 (label)
- **Complejidad**: Fácil
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con A, C, D)
- **Detalle**:
  1. Barra: cambiar `h-6` por `h-3` en la línea 286
  2. Label: eliminar `truncate` si existe, o añadir `whitespace-normal break-words` para que no corte el texto del casting title
- **Cambio**:
  ```tsx
  // Línea 286: Cambiar h-6 por h-3
  <div className="flex-1 h-3 bg-surface-container rounded overflow-hidden">
  // Label: añadir wrapping
  <span className="text-xs text-on-surface-variant whitespace-normal break-words">
  ```

#### Tarea 6: Recent Activity mejorado
- **Archivos**: `Dashboard.tsx`
- **Ubicación**: Líneas 194-214 (cómputo de `recentActivity`), 336-359 (renderizado)
- **Complejidad**: Media
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con A, C, D)
- **Detalle**:
  1. **Mostrar ID de submission**: Añadir `submissionId` al `ActivityItem` interface y mostrarlo en formato ligero (últimos 8 chars con `...` prefix)
  2. **Items pending como link al round**: Para items con `status === 'pending'`, renderizar como `<Link to={/rounds/${roundId}}>` en lugar de `<div>`
  3. **Filtrado por estado**: Pending muestra TODOS los pending. Reviewed muestra TODOS los reviewed de los últimos 2 días naturales, ordenados por `updatedAt` descendente
  4. Necesita ampliar `RoundSummary.submissions` para incluir `status` y `updatedAt` (o fetch separado)
- **Cambios**:
  ```tsx
  // Interface ActivityItem - añadir:
  submissionId?: string;
  status?: SubmissionStatus;
  roundId?: string;

  // Filtrado - reemplazar lógica actual:
  const recentActivity = useMemo(() => {
    const items: ActivityItem[] = [];
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    for (const round of rounds) {
      for (const s of round.submissions) {
        if (s.status === 'pending') {
          items.push({ /* ... */ submissionId: s.id, status: s.status, roundId: round.id });
        } else if (s.status === 'reviewed') {
          items.push({ /* ... */ submissionId: s.id, status: s.status, timestamp: s.updatedAt });
        }
      }
    }
    const pending = items.filter(i => i.status === 'pending');
    const reviewed = items.filter(i => i.status === 'reviewed' && (i.timestamp || 0) >= twoDaysAgo)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return [...pending, ...reviewed].slice(0, 10);
  }, [rounds]);
  ```

---

### Subagente C: CastingDetail.tsx (Tareas 7, 8)

#### Tarea 7: Incrementar tamaño de descripción
- **Archivos**: `CastingDetail.tsx`
- **Ubicación**: Línea 98 (`<p>` de descripción)
- **Complejidad**: Fácil
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con A, B, D)
- **Detalle**: Cambiar `text-body-lg` por `text-body-xl` o `text-lg` para mayor legibilidad.
- **Cambio**:
  ```tsx
  // Línea 98: Cambiar de
  <p className="text-on-surface-variant mt-2 font-body-lg text-body-lg">
  // A
  <p className="text-on-surface-variant mt-2 font-body-lg text-lg leading-relaxed">
  ```

#### Tarea 8: Añadir contadores de submissions
- **Archivos**: `CastingDetail.tsx`
- **Ubicación**: Debajo de Participants (línea 154), antes de Rounds
- **Complejidad**: Media
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con A, B, D)
- **Detalle**:
  1. Ampliar interface `Round` para incluir `submissions: { id: string; status: string }[]`
  2. El endpoint `GET /castings/:id` ya retorna rounds con participants pero NO submissions. Necesita fetch adicional o ampliar el backend.
  3. **Alternativa más simple**: Fetch `GET /rounds/:id` para cada round y contar submissions con `status === 'pending'` y total.
  4. Añadir sección visual debajo de participants con: "Submissions: X pending / Y total"
- **Cambio**:
  ```tsx
  // Interface Round - ampliar:
  interface Round {
    id: string;
    number: number;
    participants: { actorId: string; role: string }[];
    submissions?: { id: string; status: string }[];  // ← añadir
  }

  // Añadir sección después de Participants (línea 154):
  <div className="bg-surface border border-outline-variant/30 rounded-xl p-6 mb-6">
    <h2 className="font-headline-md text-headline-md text-on-background mb-4">Submissions</h2>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-on-surface-variant text-sm">Pending</p>
        <p className="text-2xl font-bold text-primary">{pendingCount}</p>
      </div>
      <div>
        <p className="text-on-surface-variant text-sm">Total</p>
        <p className="text-2xl font-bold text-on-surface">{totalCount}</p>
      </div>
    </div>
  </div>
  ```

---

### Subagente D (primera parte): VideoPlayerModal.tsx (Tarea 17)

#### Tarea 17: Añadir botones << y >>
- **Archivos**: `VideoPlayerModal.tsx`
- **Ubicación**: Líneas 165-183 (bloque de navegación)
- **Complejidad**: Fácil
- **Dependencias**: Ninguna
- **Paralelizable**: Sí (con A, B, C)
- **Detalle**: Añadir botones `first` y `last` separados de `prev`/`next`. Usar iconos `first_page` y `last_page` de Material Symbols. Colocarlos a los extremos del grupo de navegación, separados por un gap mayor.
- **Cambio**:
  ```tsx
  // Añadir funciones (junto a prev/next en líneas 128-129):
  const first = () => { if (currentIndex > 0) onNavigate(0); };
  const last = () => { if (currentIndex < submissions.length - 1) onNavigate(submissions.length - 1); };

  // Reemplazar bloque de navegación (líneas 165-183):
  <div className="flex items-center gap-2">
    <button onClick={first} disabled={currentIndex === 0}
      className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      <span className="material-symbols-outlined">first_page</span>
    </button>
    <button onClick={prev} disabled={currentIndex === 0}
      className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      <span className="material-symbols-outlined">chevron_left</span>
    </button>
    <span className="text-sm text-on-surface-variant min-w-[60px] text-center">
      {currentIndex + 1} / {submissions.length}
    </span>
    <button onClick={next} disabled={currentIndex === submissions.length - 1}
      className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      <span className="material-symbols-outlined">chevron_right</span>
    </button>
    <button onClick={last} disabled={currentIndex === submissions.length - 1}
      className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      <span className="material-symbols-outlined">last_page</span>
    </button>
  </div>
  ```

---

## Fase 2: RoundDetail + SubmissionCard (Tareas 9-16, 18)

> **Nota**: Estas 9 tareas todas afectan `RoundDetail.tsx`. Se ejecutan secuencialmente dentro del subagente D, pero el subagente D es paralelo con A, B, C.

### Subagente D (segunda parte): RoundDetail.tsx (Tareas 9-16, 18)

#### Tarea 9: Filtro de submissions por estado
- **Archivos**: `RoundDetail.tsx`
- **Ubicación**: Estado del componente (línea ~46), renderizado (línea ~171)
- **Complejidad**: Media
- **Dependencias**: Ninguna
- **Paralelizable**: No (secuencial con 10-16 en mismo archivo)
- **Detalle**:
  1. Añadir estado `statusFilter: Set<SubmissionStatus>` con todos los estados seleccionados por defecto
  2. Añadir tags clickeables sobre el grid de submissions
  3. Filtrar `round.submissions` antes de renderizar
- **Cambio**:
  ```tsx
  // Estado nuevo:
  const allStatuses: SubmissionStatus[] = ['pending', 'reviewed', 'selected', 'rejected'];
  const [statusFilter, setStatusFilter] = useState<Set<SubmissionStatus>>(
    new Set(allStatuses)
  );

  const toggleStatus = (status: SubmissionStatus) => {
    setStatusFilter(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  // submissions filtradas:
  const filteredSubmissions = round.submissions.filter(s => statusFilter.has(s.status));

  // Renderizado: añadir tags antes del grid
  <div className="flex gap-2 mb-4 flex-wrap">
    {allStatuses.map(status => (
      <button key={status} onClick={() => toggleStatus(status)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          statusFilter.has(status)
            ? 'bg-primary-container text-on-primary-container border-primary/30'
            : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
        }`}>
        {getStatusStyle(status).label}
      </button>
    ))}
  </div>
  ```

#### Tarea 10: Mostrar ID de submission
- **Archivos**: `RoundDetail.tsx` (SubmissionCard)
- **Ubicación**: Línea ~486 (donde se muestra el nombre del actor)
- **Complejidad**: Fácil
- **Dependencias**: Tarea 9 (mismo componente, pero sin conflicto)
- **Paralelizable**: No (secuencial con 9)
- **Detalle**: Mostrar los últimos 8 caracteres del ID debajo del email del actor, en texto pequeño y color muted.
- **Cambio**:
  ```tsx
  // Después del email del actor (línea ~489):
  {actor?.email && (
    <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{actor.email}</p>
  )}
  <p className="text-[10px] text-outline font-mono">#{submission.id.slice(-8)}</p>
  ```

#### Tarea 11: Feedback solo si existe
- **Archivos**: `RoundDetail.tsx` (SubmissionCard)
- **Ubicación**: Líneas 508-513
- **Complejidad**: Fácil
- **Dependencias**: Tarea 10
- **Paralelizable**: No
- **Detalle**: No renderizar nada si `submission.feedback` es null, vacío o `"No feedback yet."`.
- **Cambio**:
  ```tsx
  // Reemplazar líneas 508-513:
  {submission.feedback && submission.feedback.trim() && submission.feedback !== 'No feedback yet.' && (
    <>
      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-1">Director&apos;s Note</p>
      <p className="font-body-sm text-body-sm text-on-surface line-clamp-2">{submission.feedback}</p>
    </>
  )}
  ```

#### Tarea 12: Estrellas y duración en una línea bajo el email
- **Archivos**: `RoundDetail.tsx` (SubmissionCard)
- **Ubicación**: Líneas 492-504 (duration y score por separado)
- **Complejidad**: Media
- **Dependencias**: Tarea 11
- **Paralelizable**: No
- **Detalle**: Unir score (estrellas pequeñas 1-5) y duración en una sola línea紧凑a justo debajo del email. Usar escala interna 0-10 → mostrar 1-5 estrellas.
- **Cambio**:
  ```tsx
  // Reemplazar bloques de duration (492-498) y score (499-504):
  <div className="flex items-center gap-3 text-xs text-on-surface-variant">
    {submission.score != null && submission.score > 0 && (
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s} className={`material-symbols-outlined text-[14px] ${s <= Math.round(submission.score! / 2) ? 'text-primary' : 'text-outline-variant'}`}>
            {s <= Math.round(submission.score! / 2) ? 'star' : 'star_border'}
          </span>
        ))}
      </span>
    )}
    {submission.duration != null && (
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[12px]">schedule</span>
        {formatDuration(submission.duration)}
      </span>
    )}
  </div>
  ```

#### Tarea 13: Thumbnail del video
- **Archivos**: `RoundDetail.tsx` (SubmissionCard)
- **Ubicación**: Líneas 463-481 (placeholder del video)
- **Complejidad**: Media
- **Dependencias**: Tarea 12
- **Paralelizable**: No
- **Detalle**: Reemplazar el ícono `play_circle` con un `<video>` tag que muestre el primer frame. Usar `<video src={url} preload="metadata" muted>` con `poster` si está disponible. Si es YouTube/Vimeo, usar el thumbnail de la API o un placeholder con el ícono de la plataforma.
- **Cambio**:
  ```tsx
  // Reemplazar el placeholder (líneas 468-470):
  <video
    src={submission.videoUrl}
    preload="metadata"
    muted
    className="w-full h-full object-cover"
    onLoadedData={(e) => {
      const video = e.currentTarget;
      video.currentTime = 1; // Mostrar frame de 1 segundo
    }}
  />
  // Mantener el overlay de play por encima
  ```

#### Tarea 14: Retirar botón Review
- **Archivos**: `RoundDetail.tsx` (SubmissionCard)
- **Ubicación**: Líneas 514-519
- **Complejidad**: Fácil
- **Dependencias**: Tarea 13
- **Paralelizable**: No
- **Detalle**: Eliminar el bloque completo del botón Review. El review se realizará desde el VideoPlayerModal.
- **Cambio**: Eliminar líneas 514-519.

#### Tarea 15: Botones Delete con texto específico
- **Archivos**: `RoundDetail.tsx` (SubmissionCard + botón delete del round)
- **Ubicación**: Línea 527 (texto "Delete" en SubmissionCard), línea 224-228 (botón Delete Round en sidebar)
- **Complejidad**: Fácil
- **Dependencias**: Tarea 14
- **Paralelizable**: No
- **Detalle**:
  1. SubmissionCard: cambiar "Delete" por "Delete Submission"
  2. Sidebar delete round button: cambiar "Delete" por "Delete Round"
- **Cambio**:
  ```tsx
  // SubmissionCard línea 527:
  Delete Submission

  // Sidebar línea 227:
  Delete Round
  ```

#### Tarea 16: Eliminar participante
- **Archivos**: `RoundDetail.tsx` + `backend/src/infrastructure/api/v1/routes.ts`
- **Ubicación**: Sidebar de participantes (líneas 309-343), backend routes
- **Complejidad**: Compleja
- **Dependencias**: Tarea 15
- **Paralelizable**: No
- **Detalle**:
  1. **Backend**: Añadir `DELETE /rounds/:roundId/participants/:userId` que:
     - Verifique que el usuario autenticado es director del casting
     - Verifique que el participante tiene el rol indicado en la ronda
     - Verifique si el participante tiene submissions (si tiene, advertir)
     - Elimine el participant
  2. **Frontend**: Añadir ícono de aspa roja al lado de cada participante en la lista de actores y preselectores
  3. Al hacer clic, mostrar ConfirmDialog con mensaje: "This actor has X submissions. Removing them will not delete their submissions. Continue?"
  4. Tras confirmar, llamar al endpoint y refrescar la lista
- **Cambio backend**:
  ```typescript
  // routes.ts - añadir después de DELETE /rounds/:id:
  router.delete('/rounds/:roundId/participants/:userId', async (req: AuthRequest, res) => {
    const { roundId, userId } = req.params;
    const directorId = req.user?.id;

    // Verificar que el director es director del casting
    const round = await roundRepository.findById(roundId);
    if (!round) { res.status(404).json({ error: 'Round not found' }); return; }

    const casting = await castingRepository.findById(round.castingId);
    if (!casting) { res.status(404).json({ error: 'Casting not found' }); return; }

    const isDirector = casting.directorIds.some(id => id === directorId);
    if (!isDirector) { res.status(403).json({ error: 'Not authorized' }); return; }

    // Verificar submissions
    const submissions = await submissionRepository.findByRoundId(roundId);
    const hasSubmissions = submissions.some(s => s.actorId === userId);

    // Eliminar participant
    await prisma.participant.deleteMany({
      where: { roundId, userId }
    });

    res.json({ success: true, hadSubmissions: hasSubmissions });
  });
  ```
- **Cambio frontend**:
  ```tsx
  // En la lista de actores (líneas ~317-342), añadir botón de eliminar:
  {isDirector && (
    <button onClick={() => handleRemoveParticipant(a.id, 'actor')}
      className="text-error hover:text-error/80 transition-colors flex-shrink-0"
      title="Remove actor">
      <span className="material-symbols-outlined text-[16px]">close</span>
    </button>
  )}
  ```

#### Tarea 18: Unificar scoring (cross-app)
- **Archivos**: `RoundDetail.tsx`, `VideoPlayerModal.tsx`, `Dashboard.tsx`
- **Ubicación**: Donde se muestran scores/estrellas
- **Complejidad**: Media
- **Dependencias**: Ninguna (paralelizable con todas las demás tareas)
- **Paralelizable**: Sí (independiente de Tarea 14)
- **Detalle**: Crear función helper `scoreToStars(score: number): number` que convierta 0-10 → 1-5. Reemplazar toda lógica ad-hoc de conversión por esta función.
- **Cambio**:
  ```tsx
  // Crear en utils/scoring.ts:
  export function scoreToStars(score: number): number {
    if (score <= 0) return 0;
    return Math.round(score / 2);
  }

  export function StarRating({ score, size = 'text-[14px]' }: { score: number; size?: string }) {
    const stars = scoreToStars(score);
    return (
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s} className={`material-symbols-outlined ${size} ${s <= stars ? 'text-primary' : 'text-outline-variant'}`}>
            {s <= stars ? 'star' : 'star_border'}
          </span>
        ))}
      </span>
    );
  }
  ```
  Reemplazar en: SubmissionCard (RoundDetail), VideoPlayerPanel (VideoPlayerModal), Score Distribution (Dashboard).

---

## Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Tarea 16 requiere backend nuevo** | Alta | Medio | Crear endpoint antes de empezar el frontend. Verificar que Prisma schema tiene la relación correcta. |
| **Tarea 6 necesita datos adicionales** (status, updatedAt en submissions del dashboard) | Alta | Medio | Verificar si `GET /rounds/:id` ya retorna estos campos. Si no, ampliar el endpoint o fetch adicional. |
| **Tarea 13 (video thumbnail) puede ser lenta** | Media | Bajo | Usar `preload="metadata"` y limitar a 1 frame. Si el video es YouTube, fallback al ícono. |
| **Tarea 9 (filtro) puede afectar paginación futura** | Baja | Bajo | El filtro es client-side sobre datos ya cargados. No hay paginación actual. |
| **Tarea 18 toca archivos de otros subagentes** | Media | Medio | Tarea 18 es independiente de Tarea 14. Los cambios en Dashboard son cosméticos y no interfieren con el subagente B. |
| **Conflicto de merge entre subagentes** | Baja | Alto | Cada subagente opera en archivos distintos. Solo Tarea 18 toca múltiples archivos, y va al final. |

---

## Entregable

- Plan detallado para revisión antes de ejecutar
- 5 subagentes simultáneos en Fase 1 (A, B, C, D₁, D₂)
- 1 subagente continuación en Fase 2 (D₃: RoundDetail)

### Orden de ejecución resumido

```
FASE 1 (paralelo):
  ┌─ Subagente A: Layout.tsx ──────── Tareas 1, 2, 3
  ├─ Subagente B: Dashboard.tsx ───── Tareas 4, 5, 6
  ├─ Subagente C: CastingDetail.tsx ─ Tareas 7, 8
  ├─ Subagente D₁: VideoPlayerModal ─ Tarea 17
  └─ Subagente D₂: Cross-app ─────── Tarea 18 (independiente)

FASE 2 (después de Fase 1):
  └─ Subagente D₃: RoundDetail.tsx ── Tareas 9, 10, 11, 12, 13, 14, 15, 16
```

### Validación post-ejecución

1. `cd frontend && npm run test:front` — verificar que no se rompen tests unitarios
2. `cd frontend && npx playwright test` — verificar E2E flows
3. `cd backend && npx tsc --noEmit` — verificar types del backend (tarea 16)
