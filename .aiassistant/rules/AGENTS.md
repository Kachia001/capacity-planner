# Component conventions

- In Vue SFCs, assign component inputs with `const props = defineProps<...>()` and reference them as `props.<name>` in both script and template. This makes prop-owned data explicit at every usage site.
- Assign component events with `const emit = defineEmits<...>()`. Prefer named handler functions that call `emit(...)` instead of using `$emit` directly in templates.
- Use the `@/` alias for every local application import. Do not use relative import paths such as `./` or `../`; keep third-party package imports unchanged.
