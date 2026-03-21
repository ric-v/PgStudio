/**
 * Injected into Table Designer webview for SQL preview highlighting (no CDN).
 * Uses theme-friendly CSS variables; output is HTML-escaped.
 */
export const WEBVIEW_SQL_KEYWORDS = [
  'abort', 'absolute', 'access', 'action', 'add', 'admin', 'after', 'aggregate', 'all', 'also', 'alter', 'always', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'assertion', 'assignment', 'asymmetric', 'at', 'authorization',
  'backward', 'before', 'begin', 'between', 'bigint', 'binary', 'bit', 'boolean', 'both', 'by',
  'cache', 'called', 'cascade', 'case', 'cast', 'chain', 'char', 'character', 'characteristics', 'check', 'checkpoint', 'class', 'close', 'cluster', 'coalesce', 'collate', 'column', 'comment', 'commit', 'committed', 'concurrently', 'configuration', 'conflict', 'connection', 'constraint', 'constraints', 'content', 'continue', 'conversion', 'copy', 'cost', 'create', 'cross', 'csv', 'cube', 'current', 'cursor', 'cycle',
  'data', 'database', 'day', 'deallocate', 'declare', 'default', 'defaults', 'deferrable', 'deferred', 'definer', 'delete', 'delimiter', 'desc', 'dictionary', 'disable', 'discard', 'distinct', 'do', 'document', 'domain', 'double', 'drop',
  'each', 'else', 'enable', 'encoding', 'encrypted', 'end', 'enum', 'escape', 'event', 'except', 'exclude', 'excluding', 'exclusive', 'execute', 'exists', 'explain', 'extension', 'external', 'extract',
  'false', 'family', 'fetch', 'filter', 'first', 'float', 'following', 'for', 'force', 'foreign', 'forward', 'freeze', 'from', 'full', 'function', 'functions',
  'generated', 'global', 'grant', 'granted', 'greatest', 'group', 'grouping',
  'handler', 'having', 'header', 'hold', 'hour', 'identity', 'if', 'ilike', 'immediate', 'immutable', 'implicit', 'import', 'in', 'including', 'increment', 'index', 'indexes', 'inherit', 'inherits', 'initially', 'inline', 'inner', 'inout', 'input', 'insensitive', 'insert', 'instead', 'int', 'integer', 'intersect', 'interval', 'into', 'invoker', 'is', 'isnull', 'isolation',
  'join',
  'key',
  'label', 'language', 'large', 'last', 'lateral', 'leading', 'leakproof', 'least', 'left', 'level', 'like', 'limit', 'listen', 'load', 'local', 'location', 'lock', 'logged',
  'mapping', 'match', 'materialized', 'maxvalue', 'merge', 'method', 'minute', 'minvalue', 'mode', 'month', 'move',
  'name', 'names', 'national', 'natural', 'nchar', 'new', 'next', 'nfc', 'nfd', 'nfkc', 'nfkd', 'no', 'none', 'not', 'nothing', 'notify', 'notnull', 'nowait', 'null', 'nullif', 'nulls', 'numeric',
  'object', 'of', 'off', 'offset', 'oids', 'old', 'on', 'only', 'operator', 'option', 'options', 'or', 'order', 'ordinality', 'others', 'out', 'outer', 'over', 'overlaps', 'overlay', 'owned', 'owner',
  'parallel', 'parser', 'partial', 'partition', 'passing', 'password', 'placing', 'policy', 'position', 'preceding', 'precision', 'preserve', 'primary', 'prior', 'privileges', 'procedural', 'procedure', 'program', 'publication',
  'query', 'quote',
  'range', 'read', 'real', 'reassign', 'recheck', 'recursive', 'ref', 'references', 'refresh', 'reindex', 'relative', 'release', 'rename', 'repeatable', 'replace', 'replica', 'reset', 'restart', 'restrict', 'returning', 'returns', 'revoke', 'right', 'role', 'rollback', 'rollup', 'routine', 'row', 'rows', 'rule',
  'savepoint', 'schema', 'scroll', 'search', 'second', 'security', 'select', 'sequence', 'sequences', 'serializable', 'server', 'session', 'set', 'setof', 'share', 'show', 'similar', 'simple', 'skip', 'smallint', 'snapshot', 'some', 'sql', 'stable', 'standalone', 'start', 'statement', 'statistics', 'stdin', 'stdout', 'storage', 'strict', 'strip', 'substring', 'symmetric', 'sysid', 'system',
  'table', 'tables', 'tablespace', 'temp', 'template', 'temporary', 'text', 'then', 'ties', 'time', 'timestamp', 'to', 'trailing', 'transaction', 'transform', 'treat', 'trigger', 'true', 'truncate', 'trusted', 'type', 'types',
  'uescape', 'unbounded', 'uncommitted', 'unencrypted', 'union', 'unique', 'unknown', 'unlisten', 'until', 'update', 'user', 'using',
  'vacuum', 'valid', 'validate', 'validator', 'value', 'values', 'varchar', 'variadic', 'varying', 'verbose', 'version', 'view', 'volatile',
  'when', 'where', 'whitespace', 'window', 'with', 'within', 'without', 'work', 'wrapper', 'write',
  'xml', 'xmlattributes', 'xmlconcat', 'xmlelement', 'xmlexists', 'xmlforest', 'xmlnamespaces', 'xmlparse', 'xmlpi', 'xmlroot', 'xmlserialize', 'xmltable',
  'year', 'yes', 'zone',
  'btree', 'hash', 'gist', 'gin', 'brin', 'spgist'
];

/** JavaScript embedded in Table Designer webview. */
export function getWebviewSqlHighlightScript(keywordsJson: string): string {
  return `
    function escapeHtml(t) {
      return String(t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    var SQL_KW = new Set(${keywordsJson});
    function highlightSqlPreview(sql) {
      if (sql == null || sql === '') return '';
      var out = '';
      var i = 0;
      var n = sql.length;
      function isWs(code) {
        return code === 32 || code === 9 || code === 10 || code === 13;
      }
      while (i < n) {
        var code = sql.charCodeAt(i);
        if (isWs(code)) {
          var w0 = i;
          while (i < n && isWs(sql.charCodeAt(i))) i++;
          out += escapeHtml(sql.slice(w0, i));
          continue;
        }
        var c = sql[i];
        if (c === '-' && i + 1 < n && sql[i + 1] === '-') {
          var j = i + 2;
          while (j < n && sql.charCodeAt(j) !== 10 && sql.charCodeAt(j) !== 13) j++;
          out += '<span class="sql-hl-comment">' + escapeHtml(sql.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        if (c === "'") {
          var j = i + 1;
          while (j < n) {
            if (sql[j] === "'" && j + 1 < n && sql[j + 1] === "'") { j += 2; continue; }
            if (sql[j] === "'") { j++; break; }
            j++;
          }
          out += '<span class="sql-hl-string">' + escapeHtml(sql.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        if (c === '"') {
          var j = i + 1;
          while (j < n && sql[j] !== '"') j++;
          if (j < n) j++;
          out += '<span class="sql-hl-quoted">' + escapeHtml(sql.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
          var j = i;
          while (j < n) {
            var ch = sql[j];
            if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_') j++;
            else break;
          }
          var word = sql.slice(i, j);
          var low = word.toLowerCase();
          if (SQL_KW.has(low)) {
            out += '<span class="sql-hl-keyword">' + escapeHtml(word) + '</span>';
          } else {
            out += escapeHtml(word);
          }
          i = j;
          continue;
        }
        if (c >= '0' && c <= '9') {
          var j = i;
          while (j < n && ((sql[j] >= '0' && sql[j] <= '9') || sql[j] === '.')) j++;
          out += '<span class="sql-hl-number">' + escapeHtml(sql.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
        out += escapeHtml(c);
        i++;
      }
      return out;
    }
  `;
}
