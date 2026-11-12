; Atoll syntax highlighting query.
;
; Capture names follow the Zed/Helix/nvim-treesitter convention. Order
; matters: later captures override earlier ones for the same node.

; ─── Comments ─────────────────────────────────────────────────────

(line_comment) @comment
(block_comment) @comment
(doc_comment) @comment.doc

; ─── Literals ─────────────────────────────────────────────────────

(integer_literal) @number
(float_literal) @number
(boolean_literal) @boolean
(char_literal) @string
(byte_literal) @string
(raw_string_literal) @string
(raw_multiline_string_literal) @string
(byte_string_literal) @string
(multiline_string_literal) @string

(string_literal) @string
(string_content) @string
(escape_sequence) @string.escape
(string_interpolation_ident) @embedded
(string_interpolation) @embedded

(label) @label

; ─── Keywords ─────────────────────────────────────────────────────

[
  "fn"
  "struct"
  "enum"
  "type"
  "distinct"
  "trait"
  "impl"
  "const"
  "module"
  "import"
  "from"
  "as"
  "pub"
  "private"
  "internal"
  "where"
  "using"
  "mut"
  "unsafe"
  "model"
  "schema"
  "message"
  "component"
  "service"
] @keyword

[
  "if"
  "else"
  "match"
  "for"
  "in"
  "loop"
  "while"
  "return"
  "break"
  "continue"
  "yield"
  "defer"
  "error"
  "catch"
  "spawn"
  "race"
  "select"
  "transaction"
  "default"
] @keyword.control

[
  "and"
  "or"
  "not"
  "is"
] @keyword.operator

"self" @keyword

; Contextual declaration words: `test`, `bench`, `skip`, `message`,
; `when`, `draft`, `plural`, and `select` inside a message. They are
; ordinary identifiers everywhere else, so each is matched where its
; shape puts it.
((test_item
   skip: (identifier) @keyword)
 (#eq? @keyword "skip"))

((test_item
   kind: (identifier) @keyword)
 (#match? @keyword "^(test|bench)$"))

((message_line
   draft: (identifier) @keyword)
 (#eq? @keyword "draft"))

((message_block
   kind: (identifier) @keyword)
 (#match? @keyword "^(plural|select)$"))

((dialect_query
   when: (identifier) @keyword)
 (#eq? @keyword "when"))

; ─── SQL keywords ─────────────────────────────────────────────────

[
  "FROM" "WHERE" "SELECT" "DISTINCT" "ORDER" "BY" "LIMIT"
  "GET" "SAVE" "REMOVE" "INSERT" "INTO" "UPDATE" "DELETE" "UPSERT"
  "VALUES" "SET" "JOIN" "LEFT" "RIGHT" "CROSS" "ON" "GROUP"
  "HAVING" "OFFSET" "RETURNING" "FOR" "SKIP" "LOCKED" "ASC" "DESC"
  "BATCH" "UNION" "INTERSECT" "EXCEPT" "ALL" "WITH" "RECURSIVE"
  "AS" "OVER" "PARTITION" "ROWS" "RANGE" "GROUPS" "BETWEEN" "AND"
  "UNBOUNDED" "PRECEDING" "CURRENT" "ROW" "FOLLOWING"
] @keyword

; Contextual query and data-layer words.
[
  "FRAME" "DF" "SIZE" "UNIQUE" "INDEX" "USING" "INCLUDE"
  "BELONGS" "HAS" "TO" "MANY" "VIA"
] @keyword

((query_expression
   one: (identifier) @keyword)
 (#eq? @keyword "ONE"))

; ─── Operators ────────────────────────────────────────────────────

[
  ":="
  "="
  "+"
  "-"
  "*"
  "/"
  "%"
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "&&"
  "||"
  "!"
  "&"
  "|"
  "^"
  "~"
  "<<"
  ">>"
  "??"
  "?."
  "|>"
  "->"
  "=>"
  ".."
  "..="
  "+="
  "-="
  "*="
  "/="
  "%="
  "&="
  "|="
  "^="
  "<<="
  ">>="
  "??="
  "?"
] @operator

; ─── Punctuation ──────────────────────────────────────────────────

[ "(" ")" "{" "}" "[" "]" ] @punctuation.bracket
(call_type_open) @punctuation.bracket
(struct_type_open) @punctuation.bracket
(string_interpolation "${" @punctuation.special "}" @punctuation.special)
[ "," ";" ":" "::" "." "@" ] @punctuation.delimiter

; ─── Decorators ───────────────────────────────────────────────────

(decorator
  "@" @attribute
  name: (decorator_path) @attribute)

; ─── Declarations ─────────────────────────────────────────────────

(function_declaration name: (identifier) @function)
(message_declaration name: (identifier) @function)
(component_declaration
  "component" @keyword
  name: (type_identifier) @type)
(service_declaration
  "service" @keyword
  name: (type_identifier) @type)
(component_prop
  name: (identifier) @variable.parameter)
(const_declaration name: (identifier) @constant)
(trait_const_declaration name: (identifier) @constant)
(struct_declaration name: (type_identifier) @type)
(enum_declaration name: (type_identifier) @type)
(error_declaration name: (type_identifier) @type)
(trait_declaration name: (type_identifier) @type)
(type_alias name: (type_identifier) @type)
(distinct_type name: (type_identifier) @type)
(enum_variant name: (type_identifier) @variant)
(model_declaration name: (type_identifier) @type)
(schema_declaration name: (identifier) @namespace)
(field_declaration name: (identifier) @property)
(relation_clause target: (identifier) @type)
(common_table_expression name: (identifier) @namespace)
(query_source (named_type (type_identifier) @type))
(dialect_query engine: (identifier) @type)

(generic_parameter name: (type_identifier) @type)

(test_item
  name: (string_literal) @string.special)

(message_line
  locale: (identifier) @property)

(message_block
  selector: (identifier) @variable.parameter)

(message_arm
  key: (identifier) @constant)

; ─── Type references ──────────────────────────────────────────────

(named_type (type_identifier) @type)
(generic_type (named_type (type_identifier) @type))
(qualified_type (named_type (type_identifier) @type))
(borrow_type (named_type (type_identifier) @type))
(pointer_type (named_type (type_identifier) @type))
(anon_record_type name: (identifier) @property)

; Highlight known primitive type names as builtin types. Atoll's
; lexer doesn't reserve these as keywords, so we recognize them
; structurally + by name.
((named_type (type_identifier) @type.builtin)
 (#match? @type.builtin
   "^(int|float|bool|char|byte|string|bytes|String|Bytes|Buffer|Unit|void|usize|isize|u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|f32|f64|ptr|rawptr|List|Map|Set|Option|Result|Iterator|Iterable|Task|DateTime|ZonedDateTime|Date|Time|Duration|TimeZone|QueryError|SqlErrorCode|SortDir|QueryBuilder|Tx|Frame|Df|GroupBy|Expr|Row)$"))

; ─── Calls and field access ───────────────────────────────────────

(call_expression
  function: (identifier_expression (identifier) @function.call))

(generic_call_expression
  function: (identifier_expression (identifier) @function.call))

(method_call_expression
  method: (identifier) @function.method)

(generic_method_call_expression
  method: (identifier) @function.method)

(field_access_expression
  field: (identifier) @property)

(struct_literal_field
  name: (identifier) @property)

(named_argument
  name: (identifier) @variable.parameter)

(query_assignment
  (identifier) @property)

; ─── Parameters and bindings ──────────────────────────────────────

(parameter
  name: (identifier) @variable.parameter)

(binding_pattern (identifier) @variable)

(binding_statement name: (identifier) @variable)
(query_binding_statement datasource: (identifier) @namespace)

(type_group_pattern
  name: (identifier) @variable)

(struct_pattern_field
  name: (identifier) @property)

(spread_pattern
  (identifier) @variable)

(mutable_pattern "mut" @keyword)

; ─── Self / variant constructors ──────────────────────────────────

((identifier_expression (identifier) @keyword)
 (#match? @keyword "^(self|Self)$"))

; Heuristic: an identifier whose name starts with an uppercase
; letter is most likely a variant constructor or type reference
; (Atoll convention). Applies to expression position AND to bare
; pattern position (e.g. `None` in `match self { None => ..., Some(_) => ... }`,
; which parses as a binding_pattern because it has no payload parens).
((identifier_expression (identifier) @variant)
 (#match? @variant "^[A-Z]"))

((binding_pattern (identifier) @variant)
 (#match? @variant "^[A-Z]"))

; Variant patterns (with payload parens, e.g. `Some(x)`)
(variant_pattern type: (named_type (type_identifier) @variant))
(pointer_variant_pattern type: (named_type (type_identifier) @variant))
(typed_member_pattern type: (_) @type)

; ─── Markup (UI components) ──────────────────────────────────────

; A lowercase element name is an HTML tag; a PascalCase one is a
; portable element or a component.
((markup_element
   name: (identifier) @tag)
 (#match? @tag "^[a-z]"))

((markup_element
   name: (identifier) @type)
 (#match? @type "^[A-Z]"))

((markup_element
   name: (identifier) @type.builtin)
 (#match? @type.builtin "^(View|Text|Button|Image|Input|Scroll)$"))

(markup_path (identifier) @type)

(markup_field
  name: (identifier) @property)

(markup_field_shorthand
  (identifier) @variable)

; ─── Loop labels ──────────────────────────────────────────────────

(for_expression label: (label) @label)
(while_expression label: (label) @label)
(loop_expression label: (label) @label)
(break_statement label: (label) @label)
(continue_statement label: (label) @label)
