.PHONY: dev dev-down mock mock-down frontend backend db db-down prod install build test e2e-dev e2e e2e-down

# Реальный стек: PostgreSQL + бэкенд (:3000) + фронтенд (:5173).
# Остановка — Ctrl+C или make dev-down.
dev: db
	npm run dev -w @calendar/backend & echo $$! > .dev-backend.pid
	VITE_API_URL=http://localhost:3000 npm run dev -w @calendar/frontend & echo $$! > .dev-frontend.pid
	@wait

# Остановка процессов dev по PID-файлам, с добивкой по портам.
dev-down:
	@for f in .dev-backend.pid .dev-frontend.pid; do \
		if [ -f $$f ]; then kill $$(cat $$f) 2>/dev/null; rm -f $$f; fi; \
	done
	@for port in 3000 5173; do \
		pids=$$(lsof -i :$$port -sTCP:LISTEN -t 2>/dev/null || true); \
		if [ -n "$$pids" ]; then echo "killing leftover on :$$port"; echo "$$pids" | xargs kill 2>/dev/null || true; fi; \
	done
	@echo "dev processes stopped"

mock:
	npm run mock

# Остановка Prism mock-сервера на :4010.
mock-down:
	@pids=$$(lsof -i :4010 -sTCP:LISTEN -t 2>/dev/null || true); \
	if [ -n "$$pids" ]; then echo "killing prism on :4010"; echo "$$pids" | xargs kill 2>/dev/null || true; fi

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

# E2E-dev: поднять тестовый стенд (PostgreSQL + бэкенд на :3000) в Docker.
# --project-name isolation от основного docker-compose.yml.
e2e-dev:
	@if lsof -i :3000 -sTCP:LISTEN -n -P 2>/dev/null | tail -n +2 | grep -v 'com.docke' | grep -q .; then \
		echo "ERROR: port 3000 is in use by a non-Docker process. Stop dev server first (Ctrl+C in 'make dev')."; \
		exit 1; \
	fi
	docker compose -f docker-compose.e2e.yml --project-name calendar-e2e build backend
	docker compose -f docker-compose.e2e.yml --project-name calendar-e2e up -d --wait

# E2E: прогон Playwright-тестов (требует поднятого стенда — make e2e-dev).
e2e:
	npx playwright test --config e2e/playwright.config.ts

# Остановка тестового docker-compose (если был прерван без очистки).
e2e-down:
	docker compose -f docker-compose.e2e.yml --project-name calendar-e2e down -v
