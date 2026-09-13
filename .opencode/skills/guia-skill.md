
---
# ¿Qué es una Skill en OpenCode y cómo se crea?

### Definición

Una **Skill** en OpenCode es un bloque de conocimiento reutilizable que le das al agente para que lo cargue en su contexto cuando lo necesites. Es como un "manual de instrucciones" o una "plantilla" que el agente puede usar para tareas específicas.

### ¿Dónde se guardan?

Las Skills se guardan en la carpeta `.opencode/skills/` dentro de tu proyecto (si no existe, la creas). Cada Skill es un archivo Markdown (`.md`).

### Estructura de una Skill

```markdown
---
name: testing-pattern
description: Patrón para escribir tests unitarios de Value Objects y Casos de Uso
---

# Patrón de Tests para Value Objects

## Estructura del archivo de test

```typescript
// tests/unit/domain/value-objects/<Nombre>.test.ts
import <Nombre> from '../../../src/domain/value-objects/<Nombre>';

describe('<Nombre> Value Object', () => {
  describe('create()', () => {
    it('should create a valid <Nombre>', () => {
      const vo = <Nombre>.create('valid-value');
      expect(vo.getValue()).toBe('valid-value');
    });

    it('should throw error for invalid <Nombre>', () => {
      expect(() => <Nombre>.create('invalid')).toThrow('Mensaje de error');
    });
  });

  describe('equals()', () => {
    it('should return true for equal values', () => {
      const vo1 = <Nombre>.create('value');
      const vo2 = <Nombre>.create('value');
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for different values', () => {
      const vo1 = <Nombre>.create('value1');
      const vo2 = <Nombre>.create('value2');
      expect(vo1.equals(vo2)).toBe(false);
    });
  });

  describe('métodos de negocio', () => {
    // Tests específicos para métodos como isPassing(), toGrade(), etc.
  });
});