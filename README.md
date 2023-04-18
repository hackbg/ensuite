<div align="center">

# Ensuite

**Literate test-driven development for the ECMAScript language family.**

```shell
$ npx @hackbg/ensuite@latest ensuite SPEC.ts.md`
```

</div>

---

## Definitions

This project defines and implements the **literate TDD workflow**,
as used by [Fadroma](https://github.com/hackbg/fadroma).

A **literate test suite** is a program written in Markdown embedded code blocks.
Its purpose is to **describe and verify** the behavior of another program
(the **system under test**), by **combining test suites and specifications/documentation**
in the same document.

## Dependencies

* **[Runspec](https://github.com/hackbg/toolbox/tree/main/runspec)** lets you define test suites.

* **[Ganesha](https://github.com/hackbg/ganesha)** lets you write them as literate modules.

* **[Ubik](https://github.com/hackbg/ubik)** is used to publish this package to NPM.

* **[C8](https://github.com/bcoe/c8)** collects test coverage.

* **[why-is-node-still-running](https://github.com/cheap-glitch/why-is-node-still-running)**
  lets you hit `?` (question mark) if your test suite doesn't exit, in order to see what's
  holding up the event loop.
