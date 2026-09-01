# Third-party notices

TensorNote is licensed under Apache License 2.0. Its production dependency graph was reviewed for the v1.0.0 release with:

```bash
pnpm licenses list --prod --json
```

The lockfile-resolved graph contains 371 packages under permissive licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Unlicense, and one `MPL-2.0 OR Apache-2.0` dual-license package used under Apache-2.0. No GPL, AGPL, LGPL, SSPL, or other reciprocal-only production dependency was reported.

`khroma@2.1.0` omits the license field from its package metadata, so pnpm labels it `Unknown`; the distributed `license` file explicitly grants the MIT License. This was manually checked as part of the release audit.

## Direct production dependencies

| Package | Resolved version | License |
| --- | --- | --- |
| `@codemirror/commands` | 6.11.0 | MIT |
| `@codemirror/lang-markdown` | 6.5.2 | MIT |
| `@codemirror/lang-python` | 6.2.1 | MIT |
| `@codemirror/view` | 6.43.9 | MIT |
| `@jupyterlab/services` | 7.6.3 | BSD-3-Clause |
| `@phosphor-icons/react` | 2.1.10 | MIT |
| `@radix-ui/react-dialog` | 1.1.23 | MIT |
| `@radix-ui/react-tooltip` | 1.2.16 | MIT |
| `@uiw/react-codemirror` | 4.25.11 | MIT |
| `buffer` | 6.0.3 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `clsx` | 2.1.1 | MIT |
| `gray-matter` | 4.0.3 | MIT |
| `highlight.js` | 11.11.2 | BSD-3-Clause |
| `katex` | 0.16.47 | MIT |
| `mermaid` | 11.17.2 | MIT |
| `react` | 19.2.8 | MIT |
| `react-dom` | 19.2.8 | MIT |
| `react-markdown` | 10.1.0 | MIT |
| `react-router-dom` | 7.18.2 | MIT |
| `rehype-highlight` | 7.0.2 | MIT |
| `rehype-katex` | 7.0.1 | MIT |
| `remark-gfm` | 4.0.1 | MIT |
| `remark-math` | 6.0.0 | MIT |
| `tailwind-merge` | 3.6.0 | MIT |
| `yaml` | 2.9.0 | ISC |
| `zustand` | 5.0.15 | MIT |

This summary is a release audit record, not a replacement for the license files distributed by each dependency. Re-run the command above whenever `pnpm-lock.yaml` changes.
