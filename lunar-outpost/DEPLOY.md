# 🚀 Инструкция по загрузке на GitHub

## Шаг 1 — Установить Git

Скачай и установи: https://git-scm.com/download/win

После установки перезапусти PowerShell.

---

## Шаг 2 — Создать репозиторий на GitHub

1. Зайди на https://github.com
2. Нажми **New repository**
3. Имя: `lunar-outpost`
4. Оставь **Public** (для GitHub Pages)
5. **НЕ** добавляй README (уже есть)
6. Нажми **Create repository**

---

## Шаг 3 — Загрузить проект (PowerShell)

```powershell
cd "C:\Users\User\Desktop\projects\lunar-outpost"

git init
git add .
git commit -m "🚀 Initial launch: Lunar Outpost 3D"

git remote add origin https://github.com/ВАШ_USERNAME/lunar-outpost.git
git branch -M main
git push -u origin main
```

---

## Шаг 4 — Включить GitHub Pages

1. Зайди в репозиторий → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Нажми **Save**

Через ~2 минуты игра будет доступна по адресу:
**https://ВАШ_USERNAME.github.io/lunar-outpost/**

---

## Запуск локально (для тестирования)

```powershell
# Python (если установлен)
cd "C:\Users\User\Desktop\projects\lunar-outpost"
python -m http.server 8080
# Открой: http://localhost:8080

# Node.js (если установлен)
npx serve . -l 8080
```

> ⚠️ Нельзя открывать index.html напрямую из папки (file://) —  
> нужен локальный сервер из-за ES modules!
