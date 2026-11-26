// Runs SQL exercises with sql.js (SQLite compiled to WebAssembly), bundled locally.
importScripts("/static/vendor/sqljs/sql-wasm.js");
const ready = initSqlJs({ locateFile: (f) => `/static/vendor/sqljs/${f}` }).then((SQL) => {
  self.SQL = SQL;
  postMessage({ type: "ready" });
});

function runAll(db, sql) {
  const results = db.exec(sql);           // every statement; we show the last result set
  const last = results[results.length - 1];
  return last ? { columns: last.columns, rows: last.values } : { columns: [], rows: [] };
}

onmessage = async (event) => {
  await ready;
  const { id, schema, query, solution } = event.data;
  const res = { ok: false, error: null, tests: [], stdout: "", table: null };
  const fresh = () => { const db = new SQL.Database(); if (schema) db.exec(schema); return db; };
  try {
    const mine = runAll(fresh(), query);
    res.table = mine;
    if (solution) {
      const want = runAll(fresh(), solution);
      const ordered = /order\s+by/i.test(solution);
      const norm = (rows) => rows.map((r) => JSON.stringify(r));
      const a = norm(mine.rows), b = norm(want.rows);
      if (!ordered) { a.sort(); b.sort(); }
      const sameCols = mine.columns.length === want.columns.length;
      const sameRows = a.length === b.length && a.every((x, i) => x === b[i]);
      res.tests.push({ src: `columns: ${want.columns.length}`, ok: sameCols, msg: sameCols ? "" : `expected ${want.columns.length} columns (${want.columns.join(", ")}), got ${mine.columns.length}` });
      res.tests.push({ src: `rows${ordered ? " (in order)" : ""}: ${want.rows.length}`, ok: sameRows,
        msg: sameRows ? "" : `expected ${want.rows.length} rows like ${b.slice(0, 3).join(" ")}, got ${a.length} rows like ${a.slice(0, 3).join(" ")}` });
      res.ok = sameCols && sameRows;
    }
  } catch (e) {
    res.error = `SQL error: ${e.message}`;
  }
  postMessage({ type: "result", id, result: res });
};
