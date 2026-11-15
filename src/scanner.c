#include "tree_sitter/parser.h"
#include <stddef.h>

enum TokenType {
  BLOCK_COMMENT,
  MULTILINE_STRING_CONTENT,
  CALL_TYPE_OPEN,
  STRUCT_TYPE_OPEN,
  ERROR_SENTINEL
};

void *tree_sitter_atoll_external_scanner_create(void) { return NULL; }
void tree_sitter_atoll_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_atoll_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload; (void)buffer; return 0;
}
void tree_sitter_atoll_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  (void)payload; (void)buffer; (void)length;
}

static bool scan_ident_start(int c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

static bool scan_ident_continue(int c) {
  return scan_ident_start(c) || (c >= '0' && c <= '9');
}

static void scan_skip_space(TSLexer *lexer) {
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\n') {
    lexer->advance(lexer, false);
  }
}

/// After `Name[T]`, is the brace a struct literal's field list rather than
/// a block? The compiler makes the same call in `is_struct_literal_start`:
/// `{}`, `{ name: … }`, `{ name, … }`, `{ name }`, or `{ ..base }`. A
/// control-flow head such as `if arr[i] {` has a statement list instead,
/// and must stay an index followed by the body.
static bool scan_struct_body(TSLexer *lexer) {
  lexer->advance(lexer, false); // the `{`
  scan_skip_space(lexer);
  if (lexer->lookahead == '}') return true;
  if (lexer->lookahead == '.') {
    lexer->advance(lexer, false);
    return lexer->lookahead == '.';
  }
  if (!scan_ident_start(lexer->lookahead)) return false;
  while (scan_ident_continue(lexer->lookahead)) lexer->advance(lexer, false);
  scan_skip_space(lexer);
  if (lexer->lookahead == ',') return true;
  if (lexer->lookahead == '}') return true;
  if (lexer->lookahead != ':') return false;
  lexer->advance(lexer, false);
  // `:=` and `::` are not a field separator.
  return lexer->lookahead != '=' && lexer->lookahead != ':';
}

/// The `[` of a generic call's or a typed struct literal's arguments:
/// `Name[T](…)` or `Name[T] { … }`. It is the same character an index
/// opens with, so the two are told apart by what follows the matching
/// `]`: a call's `(` or a literal's `{`. The token itself is just the
/// `[`; the type list and `]` are ordinary grammar.
static bool scan_type_open(TSLexer *lexer, bool call, bool structure) {
  if (lexer->lookahead != '[') return false;
  lexer->advance(lexer, false);
  lexer->mark_end(lexer);
  unsigned depth = 1;
  while (depth && !lexer->eof(lexer)) {
    if (lexer->lookahead == '[') {
      depth++;
    } else if (lexer->lookahead == ']') {
      depth--;
    }
    lexer->advance(lexer, false);
  }
  if (depth != 0) return false;
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r') {
    lexer->advance(lexer, false);
  }
  if (call && lexer->lookahead == '(') {
    lexer->result_symbol = CALL_TYPE_OPEN;
    return true;
  }
  if (structure && lexer->lookahead == '{' && scan_struct_body(lexer)) {
    lexer->result_symbol = STRUCT_TYPE_OPEN;
    return true;
  }
  return false;
}

bool tree_sitter_atoll_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  (void)payload;
  // All external tokens are valid during error recovery. Do not consume the
  // rest of an incomplete file as multiline string content in that state.
  if (valid_symbols[ERROR_SENTINEL]) return false;

  if (valid_symbols[CALL_TYPE_OPEN] || valid_symbols[STRUCT_TYPE_OPEN]) {
    if (scan_type_open(lexer, valid_symbols[CALL_TYPE_OPEN], valid_symbols[STRUCT_TYPE_OPEN])) return true;
  }

  if (valid_symbols[MULTILINE_STRING_CONTENT]) {
    bool content = false;
    while (!lexer->eof(lexer)) {
      if (lexer->lookahead == '\\' || lexer->lookahead == '$') break;
      if (lexer->lookahead == '"') {
        unsigned quotes = 0;
        while (quotes < 3 && lexer->lookahead == '"') {
          lexer->advance(lexer, false);
          quotes++;
        }
        if (quotes == 3) break;
      } else {
        lexer->advance(lexer, false);
      }
      content = true;
      lexer->mark_end(lexer);
    }
    if (content) {
      lexer->result_symbol = MULTILINE_STRING_CONTENT;
      return true;
    }
    return false;
  }
  if (!valid_symbols[BLOCK_COMMENT]) return false;
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\n') {
    lexer->advance(lexer, true);
  }
  if (lexer->lookahead != '/') return false;
  lexer->advance(lexer, false);
  if (lexer->lookahead != '*') return false;
  lexer->advance(lexer, false);
  unsigned depth = 1;
  while (depth && !lexer->eof(lexer)) {
    if (lexer->lookahead == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '*') {
        lexer->advance(lexer, false);
        depth++;
      }
    } else if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {
        lexer->advance(lexer, false);
        depth--;
      }
    } else {
      lexer->advance(lexer, false);
    }
  }
  lexer->mark_end(lexer);
  lexer->result_symbol = BLOCK_COMMENT;
  return true;
}
