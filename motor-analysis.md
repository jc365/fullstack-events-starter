# Motor Analysis - AGENTS.md

## 1. Contexto general

AGENTS.md funciona como el "contrato social" del proyecto Castant, definiendo el stack tecnológico, convenciones de código, patrones arquitectónicos y reglas obligatorias para agentes autónomos. Su rol es crítico: sirve tanto como documentación para desarrolladores humanos como como instrucciones operativas para agentes de IA. Las 4 reglas identificadas forman un núcleo de consistencia que garantiza que modificaciones autónomas no fracturan la arquitectura del sistema. Son reglas de "guardarropa" — previenen errores sistémicos que podrían surgir de la libertad total de acción de un agente. En un contexto de desarrollo colaborativo humano-máquina, este archivo es el punto de convergencia entre intención arquitectónica y ejecución autónoma.

## 2. Análisis de cada regla

### 2.1 Regla 1: Never modify imports — no `.js` extensions on import paths

- **Propósito:** Mantener consistencia en el estilo de importación de módulos, evitando variaciones en la sintaxis de imports a través del codebase.
- **Problema que resuelve:** La inconsistencia en imports (algunos con `.js`, otros sin) genera ruido en diffs, complica revisiones de código y puede causar errores sutiles en resolución de módulos en proyectos ESM. Un agente podría "normalizar" automáticamente imports agregando extensiones, rompiendo el patrón establecido.
- **Implicaciones:** Los agentes deben reconocer y respetar el patrón existente. Esto limita la autocomodificación del código fuente y aumenta la dependencia del patrón original. Si el proyecto migrara a TypeScript puro con resolución de extensiones explícitas, esta regla se volvería obsoleta o contradictoria.
- **Relación con otras reglas:** Esta regla opera a nivel táctico (línea de código), mientras que la Regla 3 (IDs) opera a nivel estratégico (identidad de entidades). Ambas son invariantes de integridad: una afecta build-time, la otra runtime.

### 2.2 Regla 2: Backup AGENTS.md before editing → docu/saves-agents/

- **Propósito:** Garantizar trazabilidad y reversibilidad ante modificaciones al contrato fundamental del proyecto.
- **Problema que resuelve:** La pérdida de histórico de decisiones arquitectónicas. Sin backups, un cambio en AGENTS.md podría borrar contexto sobre por qué se adoptó cierta convención. Esto es especialmente crítico cuando un agente modifica las reglas que rigen su propio comportamiento — creando una posible "malestar epistemológico" donde las reglas cambian mientras se ejecutan.
- **Implicaciones:** Crea sobrecarga de proceso pero previene catástrofes de gobernanza. Los agentes deben implementar rutinas de backup antes de auto-modificarse. Sin embargo, introduce una posible inconsistencia: ¿qué sucede si la regla de backup se modifica a sí misma? Esto crea un "paradoja del mentiroso" operativo.
- **Relación con otras reglas:** Es meta-regla — rige cómo se modifican las otras reglas. Las Reglas 1, 3 y 4 son contenido; esta es metacontenido.

### 2.3 Regla 3: IDs are flat strings with prefixes (e.g. user-...). No TypedId

- **Propósito:** Simplificar el modelo de identidad asegurando que todos los IDs sean strings planos con prefijos semánticos, evitando abstracciones como TypedId.
- **Problema que resuelve:** La complejidad innecesaria de sistemas de IDs tipados. TypedId añade capas de abstracción que, en un sistema con múltiples tipos de entidad (User, Casting, Round, Submission), pueden complicar serialización, debugging y queries. Un string como `user-abc123` es inmediatamente comprensible en logs y base de datos.
- **Implicaciones:** Facilita debugging, logging y consultas SQL directas. Sin embargo, pierde type-safety en tiempo de compilación. Un agente podría pasar accidentalmente un `round-xyz` donde se espera un `user-xyz` y el error no se detectaría hasta runtime. La ausencia de TypedId requiere confiar más en la lógica de aplicación que en el type system.
- **Relación con otras reglas:** Esta regla y la Regla 4 (Director es Participant) juntas definen el modelo de datos. La Regla 3 dice "cómo identificamos entidades"; la Regla 4 dice "cómo relacionamos tipos de entidad".

### 2.4 Regla 4: Director is a Participant with role: 'director'

- **Propósito:** Unificar el concepto de "participante" como entidad base, donde el director es simplemente un participante con un rol específico, evitando duplicación de modelos.
- **Problema que resuelve:** La tentación de crear una entidad `Director` separada y paralela a `Participant`, lo que llevaría a código duplicado, queries más complejos y ambigüedad sobre cuál es la "verdad" del modelo. Al hacer del director un participante, se mantiene una única fuente de verdad para permisos y relaciones.
- **Implicaciones:** Simplifica el modelo relacional (menos tablas, menos joins) pero requiere que el sistema de roles sea lo suficientemente expresivo. Un agente debe entender que "promover" a un usuario a director significa cambiar su rol, no crear una nueva entidad. Esto introduce un acoplamiento semántico fuerte: el director NO es "más" que un participante, sino "diferente" en rol.
- **Relación con otras reglas:** Esta regla da profundidad a la Regla 3. Mientras la Regla 3 define el formato de identidad (`user-abc123`), la Regla 4 define la semántica de relación (un usuario con role='director' participa en un casting). Juntas, forman el eje del modelo de dominio.

## 3. Relaciones entre reglas

Las 4 reglas forman un sistema cohesionado pero con tensões operativas:

- **Regla 2 (Backup) → Regla 1, 3, 4:** La meta-regla permite evolucionar las otras 3. Si se decide que TypedId aporta más valor que costo, la Regla 2 garantiza que ese cambio sea reversible.

- **Regla 1 (Imports) ↔ Regla 3 (IDs):** Ambiente nivel táctico vs estratégico. La Regla 1 evita que un agente "rompa" builds por consistencia estilística; la Regla 3 evita que un agente "rompa" runtime por inconsistencia de datos. Son invariantes en capas diferentes.

- **Regla 3 (IDs) → Regla 4 (Director-Participant):** La Regla 3 establece el formato (`user-xyz`); la Regla 4 establece el significado (`role: 'director'`). Sin IDs consistentes, la unificación de Participant+Director sería imposible de implementar limpio.

- **Tensión emerente:** La Regla 2 es recursiva. Si un agente edita AGENTS.md para "mejorar" la Regla 2 misma, ¿debe backupear el pre-edit o el post-edit? Esto sugiere que la Regla 2 necesita una especificación más precisa sobre el punto de corte.

## 4. Mejoras propuestas

1. **Especificar alcance de "before editing" en Regla 2:** Agregar clarificación sobre si el backup debe incluir el contenido previo o posterior. Sugiero: "Backup AGENTS.md con su contenido previo a cualquier modificación propuesta por el agente". Esto elimina ambigüedad sobre qué versión se preserva.

2. **Añadir regla de "no auto-modificación de reglas":** Una quinta regla implícita sería: "Un agente no debe modificar Reglas 1-4 sin intervención humana explícita." Esto previene el escenario de "agente que cambia las reglas para justificar su comportamiento".

3. **Considerar TypedId con branding ligero:** La Regla 3 podría evolucionar a permitir un tipo branded (`UserId = string & {__brand: 'UserId'}`) que mantenga el beneficio de los flat strings pero añada type-safety. Esto resolvería la tensión entre simplicidad y robustez.

4. **Documentar la regla de "un solo director por casting":** La Regla 4 implica pero no establece explícitamente si un casting puede tener múltiples directores. Agregar esta invarianta a AGENTS.md preveniría ambigüedades en la implementación.

5. **Añadir sección de "reglas temporales" o "reglas de deprecación":** Permitir que reglas se marquen como "deprecated" con vías de migración, facilitando la evolución ordenada del contrato.

## 5. Conclusión

Las 4 reglas de AGENTS.md forman un sistema de invariantes bien diseñado que balancea flexibilidad operativa con consistencia arquitectónica. Cada regla resuelve una clase de problema distinta: imports (build-time), backup (governance), IDs (data model), director-participant (domain model). Su interrelación crea una trama de consistencia que permite a agentes autónomos operar sin fracturar el sistema. La mayor fortaleza del conjunto es que las reglas son lo suficientemente simples como para ser verificables mecánicamente, pero lo suficientemente profundas como para capturar problemas reales de mantenibilidad. Las áreas de mejora sugieren una madurez evolutiva: no se trata de reglas perfectas, sino de un marco vivo que puede crecer manteniendo sus principios fundamentales de reversibilidad, simplicidad y consistencia.

El sistema de reglas demuestra un entendimiento sofisticado de los desafíos del desarrollo autónomo: prevenir errores sistémicos, preservar histórico de decisiones y mantener un modelo de dominio coherente. Su diseño refleja una mentalidad de "guardrails, no walls" — las reglas guían sin parar el progreso.