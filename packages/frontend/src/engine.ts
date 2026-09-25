/*
 * Single entry point for the shared engine.
 *
 * The dashboard consumes the live TypeScript source rather than a build
 * artifact. Routing it through a relative import (instead of the bare
 * `@inventoryiq/core` specifier) keeps Vite's dependency optimizer out of the
 * picture, because the optimizer cannot follow the engine's NodeNext ".js"
 * specifiers that point at ".ts" files.
 */
export * from '../../core/src/index';
