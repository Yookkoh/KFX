/// <reference types="vite/client" />

// By referencing the Vite client types here, TypeScript understands the
// shape of `import.meta.env` and other Vite-provided globals. Without this
// reference, code that accesses `import.meta.env` will produce errors such as
// "Property 'env' does not exist on type 'ImportMeta'" during the build step.