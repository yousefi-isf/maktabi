
## tRPC Input Documentation

- Every endpoint that uses `.input(...)` must define a named input schema and place a request example immediately above it.
- Use this comment format:
```ts
/* -------------------------- Create input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "field": "value"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const createInput = z.object({
  field: z.string(),
});
```
- Include `meta.values` for fields such as `Date` that need transformer metadata.
