# knex-schema-session-store

Store sessions in a database using knex, and keep the session table in user defined schema.

## Usage

It stores session data in a [Knex](http://knexjs.org/) connected database. It split the session data to `with_schema` part and `no_schema` part. The `with_schema` part will be stored in relevant columns in database. The `no_schema` part will be stored in a text column in database.

It expose 3 function:
```ts
get(sid: string): Promise<any>
set(sid: string, sess: any, max_age: number): Promise<void>
destroy(sid: string): Promise<void>
```


### Installation

`npm install --save knex-schema-session-store`


### Example

```ts
import KnexSchemaSessionStore from 'knex-schema-session-store';

const StoreOption = {
  table_name: 'sessions',
  sid_name: 'sid',
  expire_at_name: 'expire_at',
  additional_name: 'additional',
  sync: true,
  gc_interval: 1000 * 60 * 60,
  timestamps: false,
  max_age: 1000 * 60 * 60 * 24,
  schemas: [],
};

StoreOptions.schemas.push({name: 'user_id', type: 'string', args: [100], extra: cb => cb.notNullable()});

app.use(session({
  store: new KnexSchemaSessionStore(knex, StoreOption)
)});
```

### Options

```ts
interface Options {
  // Name of the session table in the db (default: `sessions`)
	table_name?: string
  // Name of the sid column in the table (default: `sid`)
	sid_name?: string
  // Name of the expire_at column in the table (default: `expire_at`)
	expire_at_name?: string
  // Name of the `no_schema` part column in the table (default: `additional`)
	additional_name?: string
  // If true, the table will have `updated_at` and `created_at` columns. (default: `false`)
	timestamps?: boolean
  // Create the sessions table if it doesn’t exist (default: `true`)
	sync?: boolean
  // Do garbage collection every gc_interval(in milliseconds, default: 1000 * 60 * 60, aka an hour)
	gc_interval?: number
  // If the session package doesn't pass a max_age to this store, how long will this package remember the session(in milliseconds, default: 1000 * 60 * 60 * 24, aka one day)
	max_age?: number,
  // Defined the `with_schema` part using knex SchemaBuilder
	schemas?: SchemaField[],
}
```

### SchemaField

```ts
/**
 * It will use knex as this to build the schema:
 *   extra ? extra(table_builder[type](name, ...args)) : null
 * And it will use these schemas to split and merge the session data
 */
interface SchemaField {
	name: string,
	type: string,
	args?: any[],
	extra?: (cb: Knex.ColumnBuilder) => void,
}
```

