.PHONY: dev mock frontend install build test

# Поднимает мок-сервер API (:4010) и фронтенд (:5173) одной командой.
# Остановка — Ctrl+C: оба процесса завершатся вместе.
dev:
	npm run mock & \
	npm run dev -w @calendar/frontend & \
	wait

mock:
	npm run mock

frontend:
	npm run dev -w @calendar/frontend

install:
	npm install

build:
	npm run build

test:
	npm test
