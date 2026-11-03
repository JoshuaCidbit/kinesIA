#!/usr/bin/env bash
# Pruebas de rutas.  Uso:
# BASE_URL="${BASE_URL:-http://localhost:3000}"
BASE_URL="https://kinesia-api-gfbna7fab0gxdjc7.mexicocentral-01.azurewebsites.net"
# SERVERLESS_URL="${SERVERLESS_URL:-}"
SERVERLESS_URL="https://kinesia-func-bnb5fweeatc4awds.mexicocentral-01.azurewebsites.net"
# FOTO="${FOTO:-}"
FOTO="./LOShamster.jpeg" 
# bash tests/smoke.sh

call() {
  local method=$1 path=$2 body=$3 args=()
  [ -n "$body" ] && args=(-H "Content-Type: application/json" -d "$body")
  RESP=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" "${args[@]}")
  CODE=$(echo "$RESP" | tail -n1); BODY=$(echo "$RESP" | sed '$d')
  echo -e "\n▶ $method $path → HTTP $CODE\n$BODY"
}
id() { echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2; }

TS=$(date +%s)
call GET  /api/health
call POST /api/usuarios "{\"nombre\":\"Jared Hernández\",\"email\":\"jared.$TS@uaq.mx\",\"edad\":22}"; UID_=$(id)
call GET  /api/usuarios
call GET  /api/usuarios/$UID_
call PUT  /api/usuarios/$UID_ '{"nombre":"Jared Hernández Modificado","edad":23}'
call POST /api/rutinas '{"nombre":"Abducción de Hombro","descripcion":"Elevación lateral del brazo.","anguloObjetivo":90}'; RID=$(id)
call GET  /api/rutinas
call GET  /api/rutinas/$RID
call PUT  /api/rutinas/$RID '{"anguloObjetivo":95,"descripcion":"Elevación lateral ajustada."}'
call POST /api/sesiones "{\"usuarioId\":$UID_,\"rutinaId\":$RID,\"repeticiones\":12,\"precisionPromedio\":94.5,\"observaciones\":\"Excelente ejecución\"}"; SID=$(id)
call GET  /api/sesiones
call GET  /api/sesiones/$SID
call GET  /api/sesiones/usuario/$UID_
call PUT  /api/sesiones/$SID '{"repeticiones":15}'

if [ -n "$FOTO" ]; then
  echo -e "\n▶ POST /api/usuarios/$UID_/foto (storage)"
  curl -s -X POST "$BASE_URL/api/usuarios/$UID_/foto" -F "foto=@$FOTO"; echo
fi

echo -e "\n--- Casos de error esperados ---"
call POST /api/sesiones '{"usuarioId":99999,"rutinaId":1}'          # 404
call POST /api/usuarios '{"nombre":"X","email":"no-es-email"}'      # 400
call DELETE /api/rutinas/$RID                                       # 409 (tiene sesiones)

if [ -n "$SERVERLESS_URL" ]; then
  echo -e "\n▶ GET $SERVERLESS_URL/api/estadisticas/$UID_ (serverless)"
  curl -s -w "\nHTTP %{http_code}\n" "$SERVERLESS_URL/api/estadisticas/$UID_"
fi

echo -e "\n--- Limpieza ---"
call DELETE /api/sesiones/$SID
call DELETE /api/rutinas/$RID
call DELETE /api/usuarios/$UID_
