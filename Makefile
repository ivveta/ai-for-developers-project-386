.PHONY: dev mock frontend backend db db-down prod install build test

# Реальный стек: PostgreSQL + бэкенд (:3000) + фронтенд (:5173).
# Остановка — Ctrl+C: оба процесса завершатся вместе.
dev: db
	npm run dev -w @calendar/backend & \
	VITE_API_URL=http://localhost:3000 npm run dev -w @calendar/frontend & \
	wait

mock:
	npm run mock

frontend:
	npm run dev -w @calendar/frontend

# PostgreSQL для разработки и тестов (docker compose, порты 5432/5433).
db:
	docker compose up -d

db-down:
	docker compose down

backend:
	npm run dev -w @calendar/backend

# Прод-сборка: один процесс — бэкенд раздаёт API и собранный фронтенд на :3000.
prod: build
	npm start -w @calendar/backend

install:
	npm install

build:
	npm run build

test:
	npm test
