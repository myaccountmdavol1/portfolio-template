import { ensureSchema } from '../../src/lib/store/postgres/schema';
import { pgliteSql } from '../../src/lib/store/postgres/sql';
import { postgresStore } from '../../src/lib/store/postgres/store';
import { storeContract } from './contract';
import { editorContract } from './editorContract';

const sql = pgliteSql();
const store = postgresStore(sql);

const reset = async () => {
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
};

storeContract('postgres (PGlite)', { store: () => store, reset });
editorContract('postgres (PGlite)', { store: () => store, reset });
