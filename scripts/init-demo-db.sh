#!/bin/sh
set -eu
# Executed by PostgreSQL only during initialization of the separate demo volume.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=demo_password="$DEMO_DB_PASSWORD" <<'SQL'
CREATE ROLE pi_demo LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'demo_password';
ALTER DATABASE pi_demo OWNER TO pi_demo;
SQL
