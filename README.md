# Elektronika game

Стартовый проект для практического задания по ретро-аркаде.
Игровая механика пока не реализована: отображается исходный экран Hello world.

## Стек

React 17, TypeScript, Webpack 5, Less и CSS Modules, ESLint, Prettier.
Основа — официальный шаблон Intern_JavaScript из задания.

## Запуск

```sh
npm ci
npm run dev
```

Приложение: http://localhost:8080/.

## Проверки

```sh
npm run typecheck
npm run lint
npm run format:check
npm run build
```

`npm run lint:fix` исправляет автоматически устранимые замечания ESLint.
`npm run format` форматирует исходники и объявления типов.
`npm run build` использует исходную конфигурацию Webpack из шаблона и создаёт `dist/`.

## Начало разработки

- `src/components/App/App.tsx` — основной компонент.
- `src/components/App/App.module.less` — стили компонента.
- `src/components/Init.tsx` — подключение React к DOM.
- `webpack.config.js` — сборка и dev-сервер.
- `config/eslint/` и `config/prettier/` — правила проверки и форматирования.

## Исправления окружения

В исходном шаблоне конфиги ESLint ссылались на отсутствующие TypeScript, Babel
и security-плагины. Они добавлены в devDependencies. ESLint обновлён в рамках
ветки 8.x, TypeScript зафиксирован на 5.5.4 для совместимости с TypeScript ESLint 7.
Добавлены npm-команды проверок, `.gitignore` и `.editorconfig`.
Исправлены два автоматически устранимых замечания ESLint в стартовых компонентах.

Репозиторий: https://github.com/exsyyy/safeboard-test. Основная ветка: main.
