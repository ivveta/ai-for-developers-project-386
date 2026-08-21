---
description: Закоммитить изменения по Conventional Commits
---

Создай git-коммит текущих изменений. Подсказка пользователя: $ARGUMENTS

Порядок:
1. `git status`, `git diff` (HEAD и рабочее дерево), `git log --oneline -5`.
2. Стейдж только файлы задачи; не добавляй мусор (.DS_Store, test-results/, .idea/)
   и то, что пользователь не просил.
3. Сообщение по Conventional Commits — проект валидирует его хуком commitlint
   (@commitlint/config-conventional):
   - формат `<type>(<scope>): <subject>` или `<type>: <subject>`
   - type: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
   - императив, строчные буквы, без точки в конце subject
   - заголовок ≤ 100 символов, строки тела ≤ 100 символов
4. `git add <файлы>`, затем `git commit` с сообщением через heredoc.
5. Не делай `git push`.
6. Покажи итог: хеш, сообщение, файлы. Если commitlint отклонил сообщение —
   исправь формат и повтори коммит.
