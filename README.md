# knex-schema-session-store

Store sessions in a database using knex, and keep the session table in user defined schema.

## Why this

You store many data in the session, but you can not search the session table because the data is stored in a text column. For example, a web application has many clients on different paltforms like mobile, web. Different client can login to the system at the same time, so an account can login on mobile and on web. But what if the user want to kick off his other platform login information on the web. We need to search the session table with the `user_id`, show them to the user, and let the user delete one. So `user_id` cannot be in the text column storing the non-schema session data, it should has its own column. That's the reason I made this.

## Usage

It stores session data in a [Knex](http://knexjs.org/) connected database. It split the session data to `with_schema` part and `no_schema` part. The `with_schema` part will be stored in relevant columns in database. The `no_schema` part will be stored in a text column in database.

It expose functions:
```ts
constructor(knex: Knex, options?: Options);

wait_for_sync(): Promise<void>;
get(sid: string): Promise<any>;
set(sid: string, sess: any, max_age?: number): Promise<void>;
touch(sid: string, max_age?: number): Promise<void>;
destroy(sid: string): Promise<void>;
gc(): Promise<void>;
clear(): Promise<void>;
repo(): Knex.QueryBuilder;
```


### Installation

`npm install --save knex-schema-session-store`


### Example

```ts
import Store from 'knex-schema-session-store';

const StoreOptions = {
    table_name: 'sessions',
    sid_name: 'sid',
    expire_at_name: 'expire_at',
    additional_name: 'additional',
    sync: true,
    sync_timeout: 3000,
    gc_interval: 1000 * 60 * 60,
    timestamps: false,
    max_age: 1000 * 60 * 60 * 24,
    schemas: [],
};

StoreOptions.schemas.push({name: 'user_id', type: 'string', args: [100], extra: cb => cb.notNullable()});

const store = new Store(knex, StoreOption)

app.use(session({ store }));

store.wait_for_sync().then(() => {
    app.listen(3000);
});
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
    // If true, the table will have `updated_at` and `created_at` columns (default: `false`)
    timestamps?: boolean
    // Create the sessions table if it doesn’t exist (default: `true`)
    sync?: boolean
    // If we create the sessions table, how long will we wait (in milliseconds, default: 3000)
    sync_timeout?: number
    // Do garbage collection every gc_interval (in milliseconds, default: 1000 * 60 * 60, aka an hour)
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
 *      extra ? extra(table_builder[type](name, ...args)) : null
 * And it will use these schemas to split and merge the session data
 */
interface SchemaField {
    name: string,
    type: string,
    args?: any[],
    extra?: (cb: Knex.ColumnBuilder) => void,
}
```
