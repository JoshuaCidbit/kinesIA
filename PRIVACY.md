# Política de privacidad y datos de salud (borrador)

> **Borrador en revisión**. Documento provisional para el equipo KinesIA.

## Datos que recogemos

- Datos de identificación: nombre, correo electrónico, edad, foto de perfil.
- Datos de salud funcionales: historial de sesiones de rehabilitación
  (fecha, repeticiones, precisión, observaciones), resultados de planes
  calóricos (peso, objetivo cut/bulk, distribución de comidas, fitness).
- Datos técnicos de uso: tokens JWT (rol incluido) y logs operativos.

## Finalidad

- Personalización de planes de rehabilitación y nutrición.
- Evaluación del progreso del paciente por el profesional (coach/admin).

## Acceso

- El paciente accede a sus propios datos.
- El coach accede a los datos de sus pacientes asignados.
- El admin accede a los datos de todos los usuarios (operación).

## Eliminación

- Borrado en cascada de sesiones/resultados al eliminar el usuario.
- Retención de logs definida por la política operativa de la app.

## Estado

- Borrador. Pendiente de revisión legal/ética y definición de retención.
