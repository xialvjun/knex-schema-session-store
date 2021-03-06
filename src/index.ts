import * as Knex from 'knex';
// import * as assert from 'assert';



export class KnexSchemaSessionStore {
    private _knex: Knex
    private _options: Options
    private _synced: boolean = false
    private _static_field: object

    constructor(knex: Knex, options?: Options) {
        this._knex = knex;

        this._options = Object.assign({
            table_name: 'sessions',
            sid_name: 'sid',
            expire_at_name: 'expire_at',
            additional_name: 'additional',
            timestamps: false,
            sync: true,
            sync_timeout: 1000 * 3,
            gc_interval: 1000 * 60 * 60,
            max_age: 1000 * 60 * 60 * 24,
            schemas: [],
        }, options);

        const occupied_fields = this._options.schemas.map(sf => sf.name).concat([this._options.sid_name, this._options.expire_at_name]);
        if (this._options.timestamps) {
            occupied_fields.push('created_at', 'updated_at');
        }
        this._static_field = occupied_fields.reduce((acc, cv) => {
            acc[cv] = undefined;
            return acc;
        }, {});

        this.connect();
    }

    private connect() {
        if (this._synced) {
            return Promise.resolve();
        }
        let p = Promise.resolve();
        if (this._options.sync) {
            let sync_p = this._knex.schema.hasTable(this._options.table_name)
                .then(exists => {
                    if (!exists) {
                        return this._knex.schema.createTableIfNotExists(
                            this._options.table_name,
                            (table) => {
                                table.string(this._options.sid_name).primary();
                                table.text(this._options.additional_name);
                                table.bigInteger(this._options.expire_at_name).index();
                                if (this._options.timestamps) {
                                    table.timestamps();
                                }
                                this._options.schemas.forEach(sf => {
                                    let cb;
                                    if (Object.prototype.toString.call(sf.args) === '[object Array]') {
                                        cb = table[sf.type](sf.name, ...sf.args);
                                    } else {
                                        cb = table[sf.type](sf.name);
                                    }
                                    typeof sf.extra === 'function' ? sf.extra(cb) : null;
                                });
                            }
                        );
                    }
                });
            p = Promise.resolve(sync_p);
        }
        return p.then(() => {
            this._synced = true;
            setInterval(this.gc.bind(this), this._options.gc_interval);
        });
    }

    wait_for_sync() {
        return interval_check(() => this._synced, 100, this._options.sync_timeout, new Error(`Timeout Error on Syncing To Database!`));
    }

    get(sid: string): Promise<any> {
        return this.wait_for_sync().then(() => {
            return this._knex(this._options.table_name)
                .where(this._options.sid_name, sid)
                .andWhere(this._options.expire_at_name, '>', Date.now())
                .limit(1)
                .then(rows => {
                    if (rows && rows.length > 0) {
                        let row = rows[0];
                        let additional = row[this._options.additional_name];
                        let schemas_session = this._options.schemas.map(sf => sf.name).reduce((acc, cv) => {
                            acc[cv] = row[cv];
                            return acc;
                        }, {});
                        // let { [this._options.sid_name]: sid, [this._options.additional_name]: additional, [this._options.expire_at_name]: expire_at, ...schemas_session } = row;
                        additional = JSON.parse(additional || '{}');
                        return Object.assign({}, additional, schemas_session);
                    }
                    return null;
                });
        });
    }

    set(sid: string, sess: any, max_age: number = this._options.max_age) {
        return this.wait_for_sync().then(() => {
            let expire_at = Date.now() + Math.max(max_age, 0);

            let additional = Object.assign({}, sess, this._static_field);
            let update_data = { [this._options.additional_name]: JSON.stringify(additional), [this._options.expire_at_name]: expire_at };
            // knex need to set a field to null to clear the field. If it's undefined, it will ignore that field, which is not what we want.
            this._options.schemas.forEach(sf => update_data[sf.name] = sess[sf.name] === undefined ? null : sess[sf.name]);

            return this._knex(this._options.table_name)
                .where(this._options.sid_name, sid)
                .then((rows) => {
                    if (rows && rows.length > 0) {
                        return this._knex(this._options.table_name)
                            .where(this._options.sid_name, sid)
                            .update(update_data);
                    } else {
                        return this._knex(this._options.table_name)
                            .insert(Object.assign({ [this._options.sid_name]: sid }, update_data));
                    }
                });
        });
    }

    touch(sid: string, max_age: number = this._options.max_age) {
        return this.wait_for_sync().then(() => {
            let expire_at = Date.now() + Math.max(max_age, 0);
            return this._knex(this._options.table_name)
                .where(this._options.sid_name, sid)
                .update({ [this._options.expire_at_name]: expire_at });
        });
    }

    destroy(sid: string) {
        return this.wait_for_sync().then(() => {
            return this._knex(this._options.table_name)
                .where(this._options.sid_name, sid)
                .del();
        });
    }

    gc() {
        return this.wait_for_sync().then(() => {
            return this._knex(this._options.table_name)
                .where(this._options.expire_at_name, '<=', Date.now())
                .del();
        });
    }

    clear() {
        return this.wait_for_sync().then(() => this._knex(this._options.table_name).del());
    }

    repo() {
        return this._knex(this._options.table_name);
    }
}



export default KnexSchemaSessionStore;

export interface Options {
    table_name?: string,
    sid_name?: string,
    expire_at_name?: string,
    additional_name?: string,
    timestamps?: boolean,
    sync?: boolean,
    sync_timeout?: number,
    gc_interval?: number,
    max_age?: number,
    schemas?: SchemaField[],
}

export interface SchemaField {
    name: string,
    type: string,
    args?: any[],
    extra?: (cb: Knex.ColumnBuilder) => void,
}

function interval_check(check: ()=>boolean, interval: number, timeout: number, timeout_error: Error) {
    if (check()) {
        return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
        let tout = setTimeout(() => {
            clearInterval(tint);
            reject(timeout_error);
        }, timeout);
        let tint = setInterval(() => {
            if (check()) {
                clearTimeout(tout);
                resolve();
            }
        }, interval);
    });
}
