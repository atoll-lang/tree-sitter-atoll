# tree-sitter-atoll

Tree-sitter grammar for the [Atoll](https://github.com/workreef/atoll) language.

Used by the Zed extension at `code/compiler/rust/tools/zed/`. The grammar is intentionally
permissive — it's tuned for syntax highlighting, not semantic validation. The
real Atoll parser lives in `crates/atoll-syntax/`.

## Building

    tree-sitter generate
    tree-sitter test

Use Tree-sitter CLI 0.25.10 or newer. The generated parser targets language
ABI 15. `src/scanner.c` handles nested block comments, multiline string
content, and the bracket lookahead that tells a generic call or literal
(`Name[T](…)`, `Name[T] { … }`) from an index, and must be compiled alongside
`src/parser.c`.

## Coverage

The grammar targets current Atoll syntax for editor highlighting:

- Declarations: `fn`, `struct`, `enum`, `type`, `distinct type`, `trait`,
  `impl`, `const`, `module`, `import`, `model`, `schema`, `message`, and
  `test`/`bench`/`skip` items.
- Visibility (`internal`, `private`, `pub`), receiver-prefix methods,
  `self`/`&self`/`&mut self`, `p &T`/`p &mut T` parameters, colonless
  signatures, borrow types (`&T`), pointer types (`^T`), fixed arrays
  (`[N]T`), qualified types, and square-bracket effect rows.
- Quoted and unquoted imports, named imports, relative paths, and aliases.
- Decorators (`@name`, `@name(args)`).
- `:=` / `mut :=` bindings, typed bindings (`name: T = expr`).
- Calls, method calls, member access, indexing, generic calls and typed
  literals (`Name[T](…)`, `Name[T] { … }`).
- Match, if/else, mutable and consuming for loops, return/break/continue/yield/defer.
- Concurrency keywords (`spawn`, `race`, `select`).
- Literals: int (dec/hex/bin/oct, optional underscores, optional type suffix),
  float, string with `$ident`/`${expr}` interpolation segments, char, byte,
  `true`/`false`, loop labels (`'name`).
- Raw (`r"…"`, `r"""…"""`), byte (`b"…"`), and multiline (`"""…"""`)
  strings, byte literals (`b'x'`), and enum discriminants.
- Braced interpolation parses normal Atoll expressions, including nested
  records, braces, and strings.
- Comments: line, nested block, doc (four or more slashes remain ordinary
  line comments).
- Model relations and indexes; SQL reads/writes, joins, grouping, CTEs,
  set operations, window functions, dialect branches, and transactions.

The compiler's lexer and parser in `crates/atoll-syntax/src/` remain the
source of truth. This grammar accepts some incomplete or broader forms to
preserve highlighting while editing; it does not validate types or effects.

After changing the grammar or queries, run the Zed extension's preparation
script to refresh its queries and local grammar snapshot. See
`tools/zed/README.md` in the compiler workspace for the dev install workflow.
