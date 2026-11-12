/**
 * Tree-sitter grammar for the Atoll language.
 *
 * Tuned for syntax highlighting in Zed/VSCode/etc. Permissive: many
 * forms accept superset shapes the real compiler rejects, in service
 * of recovering structure from incomplete or unusual code.
 *
 * Authoritative source: `crates/atoll-syntax/src/lexer.rs` and
 * `crates/atoll-syntax/src/parser/`.
 */

const PREC = {
  assign: 1,
  pipeline: 2,    // |>
  range: 3,       // .. ..=
  or_kw: 4,       // or, ||
  and_kw: 5,      // and, &&
  not_kw: 6,      // not (unary)
  comparison: 7,  // ==, !=, <, <=, >, >=, is, is not
  bit_or: 8,      // |
  bit_xor: 9,     // ^
  bit_and: 10,    // &
  shift: 11,      // <<, >>
  additive: 12,   // +, -
  multiplicative: 13, // *, /, %
  coalesce: 14,   // ??
  unary: 15,      // -x, !x, ~x
  cast: 16,       // as
  postfix: 17,    // ., (), [], ?, ?., .catch
  primary: 18,
};

module.exports = grammar({
  name: 'atoll',

  word: $ => $.identifier,

  externals: $ => [$.block_comment, $._multiline_string_content, $.call_type_open, $.struct_type_open, $._error_sentinel],

  extras: $ => [
    /\s/,
    $.doc_comment,
    $.line_comment,
    $.block_comment,
  ],

  conflicts: $ => [
    [$.spread_pattern],
    [$.type_group_pattern, $.union_type],
    [$.parameter, $.type_group_pattern],
    [$.list_constructor, $.list_expression, $.list_pattern],
    [$.list_constructor, $.list_expression],
    [$._control_expression, $.literal_pattern],
    [$.trailing_closure_call, $.query_assignment],
    [$.trailing_closure_call, $.query_clause],
    [$.trailing_closure_call, $.query_order],
    [$.const_declaration, $.trailing_closure_call],
    [$.defer_statement, $.trailing_closure_call],
    [$.expression_statement, $.trailing_closure_call],
    [$.unit_expression, $.lambda_parameters],
    [$.function_declaration, $.never_type],
    [$.import_declaration, $.import_path],
    [$.anonymous_record, $.query_projection],
    [$.query_order],
    [$.identifier_expression, $.struct_literal_shorthand],
    [$.query_projection, $.block],
    [$.decorator],
    [$.impl_type, $.union_type],
    [$.query_source],
    [$.const_declaration, $.binding_statement],
    [$.const_declaration, $.function_declaration, $.enum_variant, $.type_alias],
    [$.function_declaration, $.named_type],
    [$.list_pattern, $.list_expression],
    [$.binding_pattern, $.identifier_expression],
    [$.named_type, $.identifier_expression],
    [$.struct_pattern, $.struct_literal],
    [$.parameter, $.identifier_expression],
    [$.spread_pattern, $.spread_expression],
    [$.spread_pattern, $.identifier_expression],
    [$.struct_literal_shorthand, $.struct_pattern_field],
    [$.parameter, $.named_type, $.identifier_expression],
    [$.parameter, $.named_type],
    [$.where_predicate, $.never_type],
    [$.identifier_expression, $.dialect_query],
    [$.named_type, $.identifier_expression, $.binding_pattern],
    [$.named_type, $.binding_pattern],
    [$.named_type, $.identifier_expression, $.dialect_query, $.binding_pattern],
    [$.error_expression, $.trailing_closure_call],
    [$.function_type, $.never_type],
    [$.block, $.anon_struct_pattern],
    [$.anon_struct_pattern, $.spread_pattern],
    [$.identifier_expression, $.struct_pattern_field],
    [$.identifier_expression, $.binding_pattern, $.struct_pattern_field],
    [$.parameter, $.named_type, $.identifier_expression, $.binding_pattern],
    [$._value_expression, $.trailing_closure_call],
    [$.identifier_expression, $.dialect_query, $.spread_pattern],
    [$.binding_pattern, $.struct_pattern_field],
    [$.identifier_expression, $.anon_struct_pattern, $.spread_pattern],
    [$.parameter, $.named_type, $.binding_pattern],
    [$.named_type, $.identifier_expression, $.dialect_query],
    [$._for_binding],
    [$.trailing_closure_call, $.match_arm],
    [$._control_expression, $.match_arm],
    [$.bare_tuple_expression, $._value_expression],
    [$.bare_tuple_expression, $.trailing_closure_call],
    [$.markup_element, $.named_type, $.identifier_expression],
    [$.markup_path, $.named_type, $.identifier_expression],
    [$.markup_element, $.markup_field_shorthand],
    [$.markup_field, $.trailing_closure_call],
    [$.named_type, $.trailing_closure, $.binding_pattern],
    [$.markup_match_arm, $.trailing_closure_call],
    [$._statement, $._control_expression],
    [$._control_expression, $.select_arm],
  ],

  supertypes: $ => [
    $._expression,
    $._statement,
    $._item,
    $._pattern,
    $._type,
    $._literal,
  ],

  rules: {
    source_file: $ => repeat($._item),

    // ─────────────────────────────────────────────────────────────
    // Items (top-level and nested in struct/enum/trait/impl bodies)
    // ─────────────────────────────────────────────────────────────

    _item: $ => choice(
      $.module_declaration,
      $.import_declaration,
      $.test_item,
      $.message_declaration,
      $.component_declaration,
      $.const_declaration,
      $.function_declaration,
      $.service_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.error_declaration,
      $.type_alias,
      $.distinct_type,
      $.trait_declaration,
      $.impl_block,
      $.model_declaration,
      $.schema_declaration,
    ),

    // ── Test and bench items ─────────────────────────────────────
    //
    // `test "name" { … }`, `bench "name" { … }`, and `skip test` /
    // `skip bench`. `test`, `bench`, and `skip` are contextual: the
    // parser recognizes them only at the top of a file, before a plain
    // string literal. They stay ordinary identifiers everywhere else,
    // which is why they are not literal tokens here.

    test_item: $ => seq(
      optional(field('skip', $.identifier)),
      field('kind', $.identifier),
      field('name', $.string_literal),
      field('body', $.block),
    ),

    // ── Message declarations ─────────────────────────────────────
    //
    // `message name(params) { locale = "text" }`, with `plural` and
    // `select` texts inside a line. `message`, `plural`, `select`, and
    // `draft` are contextual words, so they are identifiers here and
    // the queries match their spelling.

    message_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'message',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      field('body', $.message_body),
    ),

    // ── UI components ─────────────────────────────────────────────
    //
    // `component Name(props) { statements view }` (UI-COMPONENTS.md).
    // `component` is contextual in the compiler, but it is a literal here
    // so it cannot be confused with `message`, whose head has the same
    // shape. Inside a body the view is a markup element: an element name
    // and a brace holding fields, child elements, text, and control flow.

    component_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'component',
      field('name', alias($.identifier, $.type_identifier)),
      field('props', $.component_props),
      field('body', $.component_body),
    ),

    component_props: $ => seq(
      '(',
      sepBy(',', $.component_prop),
      optional(','),
      ')',
    ),

    component_prop: $ => seq(
      field('name', $.identifier),
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    ),

    component_body: $ => seq(
      '{',
      repeat($._statement),
      field('view', $.markup_element),
      '}',
    ),

    // An element: `div { … }`, `View { … }`, `Card { … }`, `kit.Card { … }`.
    markup_element: $ => prec.dynamic(2, seq(
      field('name', choice($.identifier, $.markup_path)),
      '{',
      repeat($.markup_item),
      '}',
    )),

    markup_path: $ => prec.left(seq(
      $.identifier,
      repeat1(seq('.', $.identifier)),
    )),

    markup_item: $ => seq(
      choice(
        $.markup_field,
        $.markup_field_shorthand,
        $.markup_element,
        $.markup_text,
        $.markup_hole,
        $.markup_if,
        $.markup_for,
        $.markup_match,
      ),
      optional(','),
    ),

    markup_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    markup_field_shorthand: $ => $.identifier,

    markup_text: $ => choice(
      $.string_literal,
      $.multiline_string_literal,
    ),

    markup_hole: $ => seq(
      '{',
      field('value', $._expression),
      '}',
    ),

    markup_if: $ => prec.dynamic(2, seq(
      'if',
      field('condition', $._expression),
      '{',
      repeat($.markup_item),
      '}',
      optional(seq('else', choice($.markup_if, seq('{', repeat($.markup_item), '}')))),
    )),

    markup_for: $ => prec.dynamic(2, seq(
      'for',
      field('binding', $._for_binding),
      'in',
      field('iter', $._expression),
      '{',
      repeat($.markup_item),
      '}',
    )),

    markup_match: $ => prec.dynamic(2, seq(
      'match',
      field('scrutinee', $._expression),
      '{',
      repeat($.markup_match_arm),
      '}',
    )),

    markup_match_arm: $ => seq(
      field('pattern', $._pattern),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('body', choice(
        $.markup_element,
        $.markup_if,
        $.markup_for,
        $.markup_match,
        $.markup_text,
        $.markup_hole,
      )),
      optional(','),
    ),

    message_body: $ => seq(
      '{',
      repeat($.message_line),
      '}',
    ),

    message_line: $ => seq(
      field('locale', $.identifier),
      '=',
      optional(field('draft', $.identifier)),
      field('text', $.message_text),
    ),

    message_text: $ => choice(
      $.string_literal,
      $.message_block,
    ),

    message_block: $ => seq(
      field('kind', $.identifier),
      field('selector', $.identifier),
      '{',
      repeat($.message_arm),
      '}',
    ),

    message_arm: $ => seq(
      field('key', choice($.identifier, $.string_literal)),
      '=>',
      field('text', $.message_text),
      optional(','),
    ),

    error_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'error',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('where_clause', $.where_clause)),
      choice(field('body', $.enum_body), seq('=', field('value', $._type), optional(';'))),
    ),

    // ── Decorators (prefix on items, fields, methods) ─────────────

    decorator: $ => seq(
      '@',
      field('name', $.decorator_path),
      optional(field('arguments', $.argument_list)),
    ),

    decorator_path: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier)),
    ),

    // ── Module / import ──────────────────────────────────────────

    module_declaration: $ => seq(
      'module',
      field('path', $.module_path),
      optional(';'),
    ),

    import_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'import',
      choice(
        seq(field('items', sepBy1(',', seq($.identifier, optional(seq('as', $.identifier))))), 'from', field('source', choice($.string_literal, $.import_path))),
        // import { A, B } from "path"
        seq(
          field('items', $.import_items),
          'from',
          field('source', choice($.string_literal, $.import_path)),
        ),
        // import "path" as Alias
        // import "path"
        seq(
          field('source', choice($.string_literal, $.import_path)),
          optional(seq('as', field('alias', $.identifier))),
        ),
      ),
      optional(';'),
    ),

    import_items: $ => seq(
      '{',
      sepBy1(',', seq(
        $.identifier,
        optional(seq('as', $.identifier)),
      )),
      optional(','),
      '}',
    ),

    module_path: $ => sepBy1('.', $.identifier),

    import_path: $ => seq(optional(choice('./', '../')), sepBy1(choice('/', '.'), $.identifier)),

    receiver_prefix: $ => seq(
      $.named_type, optional($.generic_arguments), choice('.', '::'),
    ),

    // ── Const ────────────────────────────────────────────────────

    const_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'const',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
      optional(';'),
    ),

    // ── Function ─────────────────────────────────────────────────

    function_declaration: $ => prec.right(seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'fn',
      optional(field('receiver', $.receiver_prefix)),
      field('name', $.identifier),
      optional(field('type_parameters', $.generic_parameters)),
      field('parameters', $.parameter_list),
      optional(choice(
        seq('!', field('error_type', $._type)),
        seq(choice(':', '->'), field('return_type', $._type)),
        // colonless return type: prefer when present to avoid greedy
        // consumption of the next item's `fn`/identifier.
        prec.dynamic(1, field('return_type', $._type)),
      )),
      optional(field('using_clause', $.using_clause)),
      optional(field('where_clause', $.where_clause)),
      choice(
        field('body', $.block),
        seq('=>', field('body', $._expression), optional(';')),
        optional(';'),               // bodyless fn (intrinsic / trait stub)
      ),
    )),

    parameter_list: $ => seq(
      '(',
      optional(seq(
        sepBy1(',', $.parameter),
        optional(','),
      )),
      ')',
    ),

    parameter: $ => choice(
      // self, &self, &mut self (and the retired `mut self` spelling).
      seq(repeat($.decorator), optional('&'), optional('mut'), 'self'),
      // name Type, name: Type, name &T, name &mut T, name = default.
      seq(
        repeat($.decorator),
        optional('mut'),
        field('name', $.identifier),
        optional(seq(optional(':'), field('type', $._type))),
        optional(seq('=', field('default', $._expression))),
      ),
    ),

    using_clause: $ => seq(
      'using',
      choice(
        $.identifier,
        seq('<', sepBy1(',', $.identifier), '>'),
        seq('[', sepBy(',', $.identifier), optional(','), ']'),
      ),
    ),

    where_clause: $ => seq(
      'where',
      sepBy1(',', $.where_predicate),
    ),

    // `T: Bound + Bound`, `T == U`, `T != U`, `T(…)`, `!T(…)`.
    // The predicate-call form is how `where intrinsics.is_int[T]()` is
    // written; `T` and `U` are ordinary types.
    where_predicate: $ => seq(
      optional('!'),
      field('type', $._type),
      optional(choice(
        seq(':', sepBy1('+', $._type)),
        seq('==', field('other', $._type)),
        seq('!=', field('other', $._type)),
        seq('(', optional(sepBy(',', $._expression)), optional(','), ')'),
      )),
    ),

    // ── Struct ───────────────────────────────────────────────────

    service_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'service',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('where_clause', $.where_clause)),
      field('body', $.struct_body),
    ),

    struct_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'struct',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('where_clause', $.where_clause)),
      field('body', $.struct_body),
    ),

    struct_body: $ => seq(
      '{',
      repeat(choice(
        seq($.field_declaration, optional(choice(',', ';'))),
        $.function_declaration,
        $.const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    model_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'model', field('name', alias($.identifier, $.type_identifier)),
      field('body', $.model_body),
    ),
    schema_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'schema', field('name', $.identifier), optional(';'),
    ),
    model_body: $ => seq('{', repeat(choice(
      seq($.field_declaration, optional(choice(',', ';'))),
      $.function_declaration, $.const_declaration,
      seq($.relation_clause, optional(choice(',', ';'))),
      seq($.index_clause, optional(choice(',', ';'))),
    )), '}'),
    relation_clause: $ => seq(
      choice(seq('BELONGS', 'TO'), seq('HAS', choice('ONE', 'MANY')), seq('MANY', 'TO', 'MANY')),
      field('target', $.identifier), optional(seq(':', field('type', $.named_type))),
      optional(seq('VIA', $.identifier)),
    ),
    index_clause: $ => seq(
      optional('UNIQUE'), 'INDEX', optional(field('name', $.identifier)),
      '(', sepBy1(',', seq($.identifier, optional(choice('ASC', 'DESC')))), optional(','), ')',
      optional(seq('USING', $.identifier)),
      optional(seq('INCLUDE', '(', sepBy1(',', $.identifier), ')')),
      optional(seq('WITH', '(', sepBy1(',', seq($.identifier, '=', $.string_literal)), ')')),
      optional(seq('WHERE', $._expression)),
    ),

    field_declaration: $ => prec.right(seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      field('name', $.identifier),
      optional(':'),
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    )),

    // ── Enum ─────────────────────────────────────────────────────

    enum_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'enum',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('where_clause', $.where_clause)),
      field('body', $.enum_body),
    ),

    enum_body: $ => seq(
      '{',
      repeat(choice(
        $.enum_variant,
        $.function_declaration,
        $.const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    enum_variant: $ => seq(
      repeat($.decorator),
      field('name', alias($.identifier, $.type_identifier)),
      optional(choice(
        $.enum_variant_tuple,
        $.enum_variant_struct,
      )),
      optional(seq('=', field('discriminant', $.integer_literal))),
      optional(choice(',', ';')),
    ),

    enum_variant_tuple: $ => seq(
      '(',
      sepBy(',', $._type),
      optional(','),
      ')',
    ),

    enum_variant_struct: $ => seq(
      '{',
      sepBy(',', $.field_declaration),
      optional(','),
      '}',
    ),

    // ── Type alias / distinct ────────────────────────────────────

    type_alias: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'type',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(seq(':', field('bound', sepBy1('+', $._type)))),
      optional(seq('=', field('value', $._type))),
      optional(';'),
    ),

    distinct_type: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'distinct',
      'type',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      '=',
      field('value', $._type),
      optional(';'),
    ),

    // ── Trait ────────────────────────────────────────────────────

    trait_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'trait',
      field('name', alias($.identifier, $.type_identifier)),
      optional(field('type_parameters', $.generic_parameters)),
      optional(field('super_traits', seq(':', sepBy1('+', $._type)))),
      optional(field('where_clause', $.where_clause)),
      field('body', $.trait_body),
    ),

    trait_body: $ => seq(
      '{',
      repeat(choice(
        $.function_declaration,
        $.trait_const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    // A trait's associated constant may be declared without a value; an
    // impl supplies it. `const NAME: Type` is the trait's contract.
    trait_const_declaration: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'const',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      optional(seq('=', field('value', $._expression))),
      optional(';'),
    ),

    // ── Impl ─────────────────────────────────────────────────────

    impl_block: $ => seq(
      repeat(choice($.decorator, $.visibility_modifier, $.unsafe_modifier)),
      'impl',
      optional(field('type_parameters', $.generic_parameters)),
      // `impl Trait for Type` or `impl Type`
      seq(
        field('first', $._type),
        optional(seq('for', field('target', $._type))),
      ),
      optional(field('where_clause', $.where_clause)),
      field('body', $.impl_body),
    ),

    impl_body: $ => seq(
      '{',
      repeat(choice(
        $.function_declaration,
        $.const_declaration,
        $.type_alias,
      )),
      '}',
    ),

    // ─────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────

    visibility_modifier: $ => choice('pub', 'private', 'internal'),
    unsafe_modifier: _ => 'unsafe',

    // ─────────────────────────────────────────────────────────────
    // Generic parameters / arguments
    // ─────────────────────────────────────────────────────────────

    generic_parameters: $ => seq(
      '[',
      sepBy1(',', $.generic_parameter),
      optional(','),
      ']',
    ),

    generic_parameter: $ => seq(
      field('name', alias($.identifier, $.type_identifier)),
      optional(seq(':', sepBy1('+', $._type))),
    ),

    generic_arguments: $ => prec.dynamic(1, seq(
      '[',
      sepBy1(',', $._type),
      optional(','),
      ']',
    )),

    // The `[T, U]` of a generic *call*, `Name[T](args)` or
    // `value.method[T](args)`. Its opening bracket is an external token
    // that matches only when the matching `]` is followed by `(`. That
    // is what tells it from an index (`value[i]`), which no lookahead in
    // the grammar itself can do.
    call_type_arguments: $ => seq(
      $.call_type_open,
      sepBy1(',', $._type),
      optional(','),
      ']',
    ),

    // The `[T]` of a typed struct literal, `Name[T] { … }`. The opening
    // bracket is external for the same reason: it matches only when the
    // matching `]` is followed by `{`, which tells it from an index.
    struct_type_arguments: $ => seq(
      $.struct_type_open,
      sepBy1(',', $._type),
      optional(','),
      ']',
    ),

    // ─────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────

    _type: $ => choice(
      $.generic_type,
      $.named_type,
      $.tuple_type,
      $.list_type,
      $.optional_type,
      $.fallible_type,
      $.function_type,
      $.unsafe_type,
      $.union_type,
      $.unit_type,
      $.never_type,
      $.qualified_type,
      $.pointer_type,
      $.borrow_type,
      $.array_type,
      $.impl_type,
      $.anon_record_type,
      $.parenthesized_type,
      $.parenthesized_function_type,
    ),

    named_type: $ => alias($.identifier, $.type_identifier),

    qualified_type: $ => prec.left(2, seq(
      $.named_type, repeat1(seq(choice('.', '::'), $.named_type)), optional($.generic_arguments),
    )),
    pointer_type: $ => prec(3, seq('^', $._type)),
    // `&T` — a borrow where a value is held; `&mut T` is the same shape
    // and is only legal in a parameter or a function type.
    borrow_type: $ => prec(3, seq('&', optional('mut'), $._type)),
    array_type: $ => prec.right(3, seq('[', choice($.integer_literal, $.identifier), ']', $._type)),
    impl_type: $ => prec.right(seq('impl', sepBy1('+', $._type))),
    parenthesized_type: $ => seq('(', $._type, ')'),

    generic_type: $ => prec(1, seq(
      $.named_type,
      $.generic_arguments,
    )),

    tuple_type: $ => seq(
      '(',
      $._type,
      ',',
      sepBy(',', $._type),
      optional(','),
      ')',
    ),

    list_type: $ => prec.right(3, seq(
      '[',
      ']',
      $._type,
    )),

    // `T?` and `T??` (the latter lexes as one `??` token).
    optional_type: $ => prec(2, seq($._type, choice('?', '??'))),
    fallible_type: $ => prec.left(1, seq($._type, '!', $._type)),

    // `fn(T, U) -> R ! E`, with an optional `using [effects]` row
    // between the parameters and the result.
    function_type: $ => prec.right(seq(
      'fn',
      '(',
      sepBy(',', $._type),
      optional(','),
      ')',
      optional($.using_clause),
      optional(seq(optional(choice('->', ':')), $._type)),
      optional(seq('!', $._type)),
    )),

    // `(T) -> R` and `() -> R` — the bare-paren function type.
    parenthesized_function_type: $ => prec.right(2, seq(
      '(',
      optional($._type),
      ')',
      '->',
      $._type,
      optional(seq('!', $._type)),
    )),

    // `{ a: T, b: U }` — an anonymous record type.
    anon_record_type: $ => seq(
      '{',
      sepBy1(',', seq(field('name', $.identifier), ':', field('type', $._type))),
      optional(','),
      '}',
    ),

    unsafe_type: $ => prec(1, seq('unsafe', $.function_type)),

    union_type: $ => prec.left(0, seq($._type, '|', $._type)),

    unit_type: $ => prec(2, seq('(', ')')),
    never_type: _ => '!',

    // ─────────────────────────────────────────────────────────────
    // Statements
    // ─────────────────────────────────────────────────────────────

    _statement: $ => choice(
      $.query_binding_statement,
      $.binding_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.yield_statement,
      $.defer_statement,
      $.expression_statement,
      $.const_declaration,
    ),

    // `report REPLICA := FROM …` — a query binding that names the
    // datasource it runs against. The datasource is only written on a
    // query binding, so this rule is separate: an ordinary binding with
    // a type annotation and no initializer cannot absorb the next
    // line's `name :=` as a datasource.
    query_binding_statement: $ => prec.dynamic(20, seq(
      field('pattern', $._pattern),
      field('datasource', $.identifier),
      ':=',
      field('value', $.query_expression),
      optional(';'),
    )),

    binding_statement: $ => seq(repeat($.decorator), choice(
      // mut name := expr
      seq(
        'mut',
        field('pattern', $._pattern),
        ':=',
        field('value', $._value_expression),
        optional(';'),
      ),
      // name := expr / pat := expr (let-style)
      prec.dynamic(20, seq(
        field('pattern', $._pattern),
        ':=',
        field('value', $._value_expression),
        optional(seq('else', field('else_branch', $.block))),
        optional(';'),
      )),
      // name : Type = expr  (typed binding, optionally mut)
      // name : Type        (uninitialized typed binding)
      prec.right(1, seq(
        optional('mut'),
        field('name', $.identifier),
        ':',
        field('type', $._type),
        optional(seq('=', field('value', $._value_expression))),
        optional(';'),
      )),
    )),

    return_statement: $ => prec.right(seq(
      'return',
      optional(field('value', $._value_expression)),
      optional(';'),
    )),

    break_statement: $ => prec.right(seq(
      'break',
      optional(field('label', $.label)),
      optional(field('value', $._expression)),
      optional(';'),
    )),

    continue_statement: $ => prec.right(seq(
      'continue',
      optional(field('label', $.label)),
      optional(';'),
    )),

    yield_statement: $ => prec.right(seq(
      'yield',
      optional(field('value', $._expression)),
      optional(';'),
    )),

    defer_statement: $ => seq(
      'defer',
      field('body', $._expression),
      optional(';'),
    ),

    // `return a, b` — parens-optional tuple sugar. It is only accepted
    // where the compiler's own top-level tuple reader is: a return and
    // a binding's value.
    bare_tuple_expression: $ => prec.right(seq(
      $._expression,
      ',',
      sepBy1(',', $._expression),
      optional(','),
    )),

    _value_expression: $ => choice(
      $._expression,
      $.bare_tuple_expression,
    ),

    expression_statement: $ => seq(
      $._expression,
      optional(';'),
    ),

    // ─────────────────────────────────────────────────────────────
    // Expressions
    // ─────────────────────────────────────────────────────────────

    _expression: $ => choice(
      $._control_expression,
      $.trailing_closure_call,
      $.struct_literal,
      $.generic_struct_literal,
      $.block,
      $.anonymous_record,
      $.lambda_expression,
    ),

    // Control-flow heads stop before a body brace. The compiler likewise
    // disables record literals and trailing closures in these positions.
    _control_expression: $ => choice(
      $._literal,
      $.identifier_expression,
      $.path_expression,
      $.parenthesized_expression,
      $.tuple_expression,
      $.list_expression,
      $.unsafe_block,
      $.if_expression,
      $.match_expression,
      $.for_expression,
      $.loop_expression,
      $.while_expression,
      $.spawn_expression,
      $.race_expression,
      $.select_expression,
      $.unary_expression,
      $.binary_expression,
      $.cast_expression,
      $.range_expression,
      $.assignment_expression,
      $.call_expression,
      $.generic_call_expression,
      $.method_call_expression,
      $.generic_method_call_expression,
      $.field_access_expression,
      $.index_expression,
      $.optional_call,                // ?. and ?
      $.dereference_expression,
      $.list_constructor,
      $.transaction_expression,
      $.query_expression,
      $.query_continuation,
      $.dialect_query,
      $.window_expression,
      $.unit_expression,
      $.catch_expression,
      $.error_expression,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.yield_statement,
    ),

    identifier_expression: $ => choice($.identifier, alias('self', $.identifier)),

    error_expression: $ => seq('error', field('value', $._expression)),

    unit_expression: _ => seq('(', ')'),
    catch_expression: $ => prec(PREC.postfix, seq(
      field('value', $._expression), 'catch', '{', repeat($.match_arm), '}',
    )),
    trailing_closure_call: $ => prec.dynamic(1, seq(
      field('function', $._expression), field('closure', $.trailing_closure),
    )),
    trailing_closure: $ => seq(
      '{', optional(field('parameters', choice($.identifier, $.lambda_parameters))),
      '=>', repeat($._statement), '}',
    ),

    list_constructor: $ => prec.dynamic(1, seq(
      '[', ']', field('type', $._type), field('arguments', $.call_argument_list),
    )),
    anonymous_record: $ => seq('{', $.struct_literal_field,
      repeat(seq(optional(','), choice($.struct_literal_field, $.struct_literal_shorthand))),
      optional(','), '}'),
    dereference_expression: $ => prec(PREC.postfix, seq(field('value', $._expression), '.', '^')),
    transaction_expression: $ => seq('transaction', $.block),

    // SQL is part of Atoll source; clause bodies use ordinary expressions.
    query_expression: $ => prec.right(-1, seq(
      optional($.with_clause),
      choice(
        // `ONE FROM …` — `ONE` is a contextual word, so it is an
        // identifier here and the query captures its spelling.
        seq(optional(field('one', $.identifier)), 'FROM', $.query_source),
        seq(choice('GET', 'REMOVE'), $.query_source, $.argument_list),
        seq(choice('SAVE', 'UPDATE', 'UPSERT'), $.query_source, optional($.query_projection)),
        seq('INSERT', 'INTO', $.query_source),
        seq('DELETE', 'FROM', $.query_source),
      ),
      repeat($.query_clause),
      optional('?'),
    )),
    query_source: $ => seq(
      choice($.named_type, $.qualified_type, seq('(', $.query_expression, ')')),
      optional(seq('AS', $.identifier)),
    ),
    query_continuation: $ => prec.dynamic(-1, prec.right(-1, seq(
      field('base', $._expression), repeat1($.query_clause), optional('?'),
    ))),
    with_clause: $ => seq('WITH', optional('RECURSIVE'), sepBy1(',', $.common_table_expression)),
    common_table_expression: $ => seq(
      field('name', $.identifier), 'AS', '(', $.query_expression, ')',
    ),
    query_clause: $ => prec.right(choice(
      seq('ON', sepBy1(',', $.identifier)),
      seq('WHERE', $._expression, optional(seq('if', $._expression))),
      seq(optional(choice('LEFT', 'RIGHT', 'CROSS')), 'JOIN', $.query_source, optional(seq('ON', $._expression))),
      seq('GROUP', 'BY', sepBy1(',', $._expression)),
      seq('HAVING', $._expression),
      seq('SELECT', optional('DISTINCT'), optional(choice($.query_projection, '*'))),
      seq('ORDER', 'BY', sepBy1(',', $.query_order)),
      seq(choice('LIMIT', 'OFFSET'), $._expression),
      seq('RETURNING', choice('*', $.query_projection, sepBy1(',', $._expression))),
      seq('FOR', 'UPDATE', optional(seq('SKIP', 'LOCKED'))),
      seq('BATCH', 'SIZE', $._expression),
      seq('AS', choice('FRAME', 'DF')),
      seq(choice('UNION', 'INTERSECT', 'EXCEPT'), optional('ALL'), $.query_expression),
      seq('FROM', $._expression),
      seq('SET', choice($.query_projection, sepBy1(',', $.query_assignment))),
      seq('VALUES', $.query_projection),
    )),
    query_projection: $ => seq('{',
      sepBy(',', choice($.struct_literal_field, $.struct_literal_shorthand, $.spread_expression)),
      optional(','), '}'),
    query_assignment: $ => seq($.identifier, '=', $._expression),
    query_order: $ => seq($._expression, optional(choice('ASC', 'DESC')), optional(seq('if', $._expression))),
    dialect_query: $ => prec.right(seq(
      field('when', $.identifier), field('engine', $.identifier), $.block,
      repeat(seq('else', field('when', $.identifier), field('engine', $.identifier), $.block)),
      optional(seq('else', $.block)),
    )),
    window_expression: $ => prec(PREC.postfix, seq(
      field('function', $._expression), 'OVER', '(',
      optional(seq('PARTITION', 'BY', sepBy1(',', $._expression))),
      optional(seq('ORDER', 'BY', sepBy1(',', $.query_order))),
      optional(seq(choice('ROWS', 'RANGE', 'GROUPS'),
        choice($.window_bound, seq('BETWEEN', $.window_bound, 'AND', $.window_bound)))),
      ')',
    )),
    window_bound: $ => choice(
      seq('CURRENT', 'ROW'),
      seq(choice('UNBOUNDED', $.integer_literal), choice('PRECEDING', 'FOLLOWING')),
    ),

    path_expression: $ => prec(1, seq(
      $.identifier,
      repeat1(seq('::', $.identifier)),
    )),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_expression: $ => seq(
      '(',
      $._expression,
      ',',
      sepBy(',', $._expression),
      optional(','),
      ')',
    ),

    list_expression: $ => seq(
      '[',
      sepBy(',', $._expression),
      optional(','),
      ']',
    ),

    struct_literal: $ => prec(1, seq(
      field('type', choice(
        $.named_type,
        $.generic_type,
        seq($.named_type, repeat1(seq(choice('.', '::'), $.named_type))),
      )),
      '{',
      optional(seq(choice($.struct_literal_field, $.struct_literal_shorthand, $.spread_expression),
        repeat(seq(optional(','), choice($.struct_literal_field, $.struct_literal_shorthand, $.spread_expression))))),
      optional(','),
      '}',
    )),

    generic_struct_literal: $ => prec(2, seq(
      field('type', $.named_type),
      field('type_arguments', $.struct_type_arguments),
      '{',
      optional(seq(choice($.struct_literal_field, $.struct_literal_shorthand, $.spread_expression),
        repeat(seq(optional(','), choice($.struct_literal_field, $.struct_literal_shorthand, $.spread_expression))))),
      optional(','),
      '}',
    )),

    struct_literal_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    struct_literal_shorthand: $ => $.identifier,

    spread_expression: $ => seq('..', $._expression),

    block: $ => seq(
      '{',
      repeat($._statement),
      '}',
    ),

    unsafe_block: $ => seq('unsafe', $.block),

    if_expression: $ => prec.right(PREC.postfix + 2, seq(
      'if',
      choice(
        // if-let: if pat := value { ... }
        prec.dynamic(20, seq(
          field('pattern', $._pattern),
          ':=',
          field('scrutinee', $._control_expression),
        )),
        field('condition', $._control_expression),
      ),
      field('then', $.block),
      optional(seq(
        'else',
        field('else', choice($.block, $.if_expression)),
      )),
    )),

    match_expression: $ => prec(PREC.postfix + 2, seq(
      'match',
      optional(field('scrutinee', $._control_expression)),
      '{',
      repeat($.match_arm),
      '}',
    )),

    match_arm: $ => seq(
      field('pattern', choice($._pattern, 'else')),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('body', choice(
        $._expression,
        $.return_statement,
        $.break_statement,
        $.continue_statement,
        $.yield_statement,
        $.error_expression,
      )),
      optional(','),
    ),

    for_expression: $ => prec.right(PREC.postfix + 2, seq(
      optional(field('label', seq($.label, ':'))),
      'for',
      optional(choice(
        // for x in xs
        // for k, v in map  (Atoll bare-comma sugar)
        seq(
          optional('mut'),
          field('binding', $._for_binding),
          'in',
          field('iter', $._control_expression),
        ),
        seq(field('binding', $._pattern), ':=', field('value', $._control_expression)),
        // for cond
        field('condition', $._control_expression),
      )),
      field('body', $.block),
    )),

    _for_binding: $ => seq(
      optional('mut'),
      sepBy1(',', $._pattern),
    ),

    loop_expression: $ => seq(
      optional(field('label', seq($.label, ':'))),
      'loop',
      field('body', $.block),
    ),

    while_expression: $ => prec(PREC.postfix + 2, seq(
      optional(field('label', seq($.label, ':'))),
      'while',
      field('condition', $._control_expression),
      field('body', $.block),
    )),

    spawn_expression: $ => prec.right(seq('spawn', $._expression)),

    race_expression: $ => seq('race', $.block),
    select_expression: $ => seq('select', '{', repeat($.select_arm), '}'),
    select_arm: $ => prec.right(seq(
      choice(seq(field('pattern', $._pattern), ':=', field('awaitable', $._expression)), 'default'),
      '=>', field('body', choice($._expression, $.return_statement, $.break_statement)), optional(','),
    )),

    lambda_expression: $ => choice(
      // bare: x => expr   (x, y) => expr
      prec.right(-1, seq(
        field('parameters', choice(
          $.identifier,
          $.lambda_parameters,
        )),
        '=>',
        field('body', $._expression),
      )),
      // braced: { x => body }   { => body }   { (x, y) => body }
      prec.right(seq(
        '{',
        optional(field('parameters', choice(
          $.identifier,
          $.lambda_parameters,
        ))),
        '=>',
        field('body', $._expression),
        '}',
      )),
    ),

    lambda_parameters: $ => seq(
      '(', sepBy(',', $.parameter), ')',
    ),

    unary_expression: $ => choice(
      prec.right(PREC.unary, seq(
        field('operator', choice('-', '!', '~', '&', '^')),
        field('argument', $._expression),
      )),
      // `&mut place` — the writable borrow, one operator.
      prec.right(PREC.unary, seq(
        field('operator', seq('&', 'mut')),
        field('argument', $._expression),
      )),
      prec.right(PREC.not_kw, seq(
        field('operator', 'not'),
        field('argument', $._expression),
      )),
    ),

    binary_expression: $ => {
      const ops = [
        [PREC.pipeline,        '|>',          'left'],
        [PREC.coalesce,        '??',          'left'],
        [PREC.or_kw,           '||',          'left'],
        [PREC.or_kw,           'or',          'left'],
        [PREC.and_kw,          '&&',          'left'],
        [PREC.and_kw,          'and',         'left'],
        [PREC.comparison,      '==',          'left'],
        [PREC.comparison,      '!=',          'left'],
        [PREC.comparison,      '<',           'left'],
        [PREC.comparison,      '<=',          'left'],
        [PREC.comparison,      '>',           'left'],
        [PREC.comparison,      '>=',          'left'],
        [PREC.comparison,      'is',          'left'],
        [PREC.comparison,      seq('is', 'not'), 'left'],
        [PREC.comparison,      'in',          'left'],
        [PREC.bit_or,          '|',           'left'],
        [PREC.bit_xor,         '^',           'left'],
        [PREC.bit_and,         '&',           'left'],
        [PREC.shift,           '<<',          'left'],
        [PREC.shift,           '>>',          'left'],
        [PREC.additive,        '+',           'left'],
        [PREC.additive,        '-',           'left'],
        [PREC.multiplicative,  '*',           'left'],
        [PREC.multiplicative,  '/',           'left'],
        [PREC.multiplicative,  '%',           'left'],
      ];
      return choice(...ops.map(([p, op, assoc]) =>
        (assoc === 'right' ? prec.right : prec.left)(p, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression),
        )),
      ));
    },

    cast_expression: $ => prec.left(PREC.cast, seq(
      field('value', $._expression),
      'as',
      field('type', $._type),
    )),

    range_expression: $ => prec.left(PREC.range, choice(
      seq($._expression, choice('..', '..='), $._expression),
      seq($._expression, choice('..', '..=')),
      seq(choice('..', '..='), $._expression),
      choice('..', '..='),
    )),

    assignment_expression: $ => prec.right(PREC.assign, seq(
      field('target', $._expression),
      field('operator', choice(
        '=', '+=', '-=', '*=', '/=', '%=',
        '&=', '|=', '^=', '<<=', '>>=', '??=',
      )),
      field('value', $._expression),
    )),

    call_expression: $ => prec(PREC.postfix, seq(
      field('function', $._expression),
      field('arguments', $.call_argument_list),
    )),

    // `Name[T](args)` and `value.method[T](args)`. These carry explicit
    // type arguments, which are otherwise ambiguous with an index, so
    // they take a dynamic precedence above `index_expression`.
    generic_call_expression: $ => prec.dynamic(10, prec(PREC.postfix, seq(
      field('function', $._expression),
      field('type_arguments', $.call_type_arguments),
      field('arguments', $.call_argument_list),
    ))),

    // A call's `(` is immediate: `f (x)` with a space, or `f\n(x)` on the
    // next line, is not a call. The compiler stops a fresh-line `(` from
    // being one too; requiring adjacency is the closest a grammar with
    // no newline token can come, and it keeps a statement that opens with
    // a tuple pattern from being swallowed as the previous call's args.
    call_argument_list: $ => seq(
      token.immediate('('),
      sepBy(',', choice(
        $.named_argument,
        $._expression,
      )),
      optional(','),
      ')',
    ),

    method_call_expression: $ => prec(PREC.postfix + 1, seq(
      field('receiver', $._expression),
      '.',
      field('method', $.identifier),
      field('arguments', $.call_argument_list),
    )),

    generic_method_call_expression: $ => prec.dynamic(10, prec(PREC.postfix + 1, seq(
      field('receiver', $._expression),
      '.',
      field('method', $.identifier),
      field('type_arguments', $.call_type_arguments),
      field('arguments', $.call_argument_list),
    ))),

    field_access_expression: $ => prec.left(PREC.postfix, seq(
      field('object', $._expression),
      '.',
      field('field', choice($.identifier, $.integer_literal)),
    )),

    index_expression: $ => prec.left(PREC.postfix + 1, seq(
      field('object', $._expression),
      token.immediate('['),
      field('index', $._expression),
      ']',
      repeat(seq(token.immediate('['), field('index', $._expression), ']')),
    )),

    optional_call: $ => choice(
      prec(PREC.postfix, seq(
        field('object', $._expression),
        '?.',
        field('field', choice($.identifier, $.integer_literal)),
      )),
      prec(PREC.postfix, seq(
        field('object', $._expression),
        '?',
      )),
    ),

    argument_list: $ => seq(
      '(',
      sepBy(',', choice(
        $.named_argument,
        $._expression,
      )),
      optional(','),
      ')',
    ),

    named_argument: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    // ─────────────────────────────────────────────────────────────
    // Patterns
    // ─────────────────────────────────────────────────────────────

    _pattern: $ => choice(
      $.mutable_pattern,
      $.wildcard_pattern,
      $.literal_pattern,
      $.negative_literal_pattern,
      $.binding_pattern,
      $.type_group_pattern,
      $.pointer_variant_pattern,
      $.typed_member_pattern,
      $.tuple_pattern,
      $.list_pattern,
      $.anon_struct_pattern,
      $.struct_pattern,
      $.variant_pattern,
      $.range_pattern,
      $.or_pattern,
      $.parenthesized_pattern,
      $.spread_pattern,
      $.qualified_pattern,
    ),

    // `mut pat` — the mutable binding marker. The compiler refuses it
    // on anything that binds no name, but the grammar keeps the shape.
    mutable_pattern: $ => prec(2, seq('mut', $._pattern)),

    qualified_pattern: $ => $.qualified_type,

    wildcard_pattern: _ => '_',
    literal_pattern: $ => $._literal,

    // `-2`, `-1.5` — a negative numeric literal in pattern position.
    negative_literal_pattern: $ => prec(2, seq(
      '-',
      choice($.integer_literal, $.float_literal),
    )),

    binding_pattern: $ => prec.right(seq(
      $.identifier,
      optional(seq('@', $._pattern)),
    )),

    // `name: ErrorType` — a type-group pattern over an error union.
    type_group_pattern: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    // `^Name(p)` — the `^Name` member of a union, matched by the name
    // its type is written with.
    pointer_variant_pattern: $ => prec(1, seq(
      '^',
      field('type', $.named_type),
      '(',
      sepBy(',', $._pattern),
      optional(','),
      ')',
    )),

    // `(fn(int) -> int)(g)` — a union member headed by its type.
    typed_member_pattern: $ => prec(1, seq(
      '(',
      field('type', $._type),
      ')',
      '(',
      sepBy(',', $._pattern),
      optional(','),
      ')',
    )),

    tuple_pattern: $ => seq(
      '(',
      $._pattern,
      ',',
      sepBy(',', $._pattern),
      optional(','),
      ')',
    ),

    list_pattern: $ => seq(
      '[',
      sepBy(',', $._pattern),
      optional(','),
      ']',
    ),

    // `{ field, field: pat, .. }` — an untyped record pattern.
    anon_struct_pattern: $ => seq(
      '{',
      sepBy(',', $.struct_pattern_field),
      optional(','),
      optional(seq('..', optional($.identifier))),
      '}',
    ),

    struct_pattern: $ => prec(1, seq(
      field('type', choice($.named_type, $.generic_type, $.qualified_type)),
      '{',
      sepBy(',', $.struct_pattern_field),
      optional(','),
      optional(seq('..', optional($.identifier))),
      '}',
    )),

    struct_pattern_field: $ => choice(
      seq(optional('mut'), field('name', $.identifier), ':', field('pattern', $._pattern)),
      seq(optional('mut'), $.identifier),
      $.spread_pattern,
    ),

    variant_pattern: $ => prec(1, seq(
      field('type', choice($.named_type, $.generic_type, $.qualified_type)),
      optional(seq(
        token.immediate('('),
        sepBy(',', $._pattern),
        optional(','),
        ')',
      )),
    )),

    range_pattern: $ => prec.left(2, seq(
      choice($.literal_pattern, $.negative_literal_pattern, $.binding_pattern),
      choice('..', '..='),
      optional(choice($.literal_pattern, $.negative_literal_pattern, $.binding_pattern)),
    )),

    or_pattern: $ => prec.left(seq(
      $._pattern,
      '|',
      $._pattern,
    )),

    parenthesized_pattern: $ => seq('(', $._pattern, ')'),
    spread_pattern: $ => seq('..', optional('mut'), optional($.identifier)),

    // ─────────────────────────────────────────────────────────────
    // Literals
    // ─────────────────────────────────────────────────────────────

    _literal: $ => choice(
      $.integer_literal,
      $.float_literal,
      $.string_literal,
      $.char_literal,
      $.byte_literal,
      $.boolean_literal,
      $.raw_string_literal,
      $.raw_multiline_string_literal,
      $.byte_string_literal,
      $.multiline_string_literal,
    ),

    integer_literal: _ => token(seq(
      choice(
        /0[xX][0-9a-fA-F][0-9a-fA-F_]*/,
        /0[bB][01][01_]*/,
        /0[oO][0-7][0-7_]*/,
        /[0-9][0-9_]*/,
      ),
      optional(/[ui](8|16|32|64|128|size)|f(32|64)/),
    )),

    float_literal: _ => token(choice(
      // 1.5, 1.5e10, 1.5e-10, with optional underscores
      seq(/[0-9][0-9_]*/, '.', /[0-9][0-9_]*/, optional(/[eE][+-]?[0-9][0-9_]*/), optional(/f(32|64)/)),
      // 1e10
      seq(/[0-9][0-9_]*/, /[eE][+-]?[0-9][0-9_]*/, optional(/f(32|64)/)),
    )),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.string_interpolation,
        $.string_interpolation_ident,
        token.immediate('$'),
      )),
      '"',
    ),

    string_content: _ => token.immediate(prec(1, /[^"\\$]+/)),

    raw_string_literal: _ => token(seq('r"', /[^"]*/, '"')),
    raw_multiline_string_literal: _ => token(seq(
      'r"""',
      repeat(choice(/[^"]+/, /"[^"]/, /""[^"]/)),
      '"""',
    )),
    byte_string_literal: _ => token(seq('b"', repeat(choice(/[^"\\]/, /\\./)), '"')),
    multiline_string_literal: $ => seq('"""', repeat(choice(
      alias($._multiline_string_content, $.string_content),
      $.escape_sequence, $.string_interpolation, $.string_interpolation_ident,
      token.immediate('$'),
    )), '"""'),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /[\\nrt0"'$]/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u\{[0-9a-fA-F]+\}/,
      ),
    )),

    // Braced interpolation is ordinary source, including nested braces and strings.
    string_interpolation: $ => seq(
      token.immediate('${'),
      $._expression,
      '}',
    ),

    // `$ident` shorthand
    string_interpolation_ident: _ => token.immediate(seq(
      '$',
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    )),

    char_literal: _ => token(seq(
      "'",
      choice(
        /[^'\\\n]/,
        seq('\\', choice(
          /[\\nrt0"'$]/,
          /x[0-9a-fA-F]{2}/,
          /u[0-9a-fA-F]{4}/,
          /u\{[0-9a-fA-F]+\}/,
        )),
      ),
      "'",
    )),

    byte_literal: _ => token(seq(
      "b'",
      choice(
        /[^'\\\n]/,
        seq('\\', choice(
          /[\\nrt0"']/,
          /x[0-9a-fA-F]{2}/,
        )),
      ),
      "'",
    )),

    boolean_literal: _ => choice('true', 'false'),

    label: _ => token(seq("'", /[a-zA-Z_][a-zA-Z0-9_]*/)),

    // ─────────────────────────────────────────────────────────────
    // Identifiers
    // ─────────────────────────────────────────────────────────────

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Same lexical class — distinguished only by being in a
    // type position. Lets highlight queries target type names.

    // ─────────────────────────────────────────────────────────────
    // Comments
    // ─────────────────────────────────────────────────────────────

    line_comment: _ => token(seq('//', optional(choice(
      /[^/\n][^\n]*/, seq('//', /[^\n]*/),
    )))),
    doc_comment: _ => token(seq('///', optional(seq(/[^/\n]/, /[^\n]*/)))),
  },
});

function sepBy(sep, rule) {
  return optional(sepBy1(sep, rule));
}

function sepBy1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}
