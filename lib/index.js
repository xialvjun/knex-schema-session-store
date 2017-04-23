"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
class KnexSchemaSessionStore {
    constructor(knex, options) {
        this._synced = false;
        this._knex = knex;
        this._options = Object.assign({
            table_name: 'sessions',
            sid_name: 'sid',
            expire_at_name: 'expire_at',
            additional_name: 'additional',
            timestamps: false,
            sync: true,
            gc_interval: 1000 * 60 * 60,
            max_age: 1000 * 60 * 60 * 24,
            schemas: [],
        }, options);
        const occupied_fields = this._options.schemas.map(sf => sf.name).concat([this._options.sid_name, this._options.expire_at_name]);
        if (this._options.timestamps) {
            occupied_fields.push('created_at', 'updated_at');
        }
        this._filter_static_field = occupied_fields.reduce((acc, cv) => {
            acc[cv] = undefined;
            return acc;
        }, {});
    }
    connect() {
        if (this._synced) {
            return Promise.resolve();
        }
        let p;
        if (this._options.sync) {
            p = Promise.resolve(this._knex.schema.createTableIfNotExists(this._options.table_name, (table) => {
                table.string(this._options.sid_name).primary();
                table.text(this._options.additional_name);
                table.timestamp(this._options.expire_at_name, true).index();
                if (this._options.timestamps) {
                    table.timestamps();
                }
                this._options.schemas.forEach(sf => {
                    let cb = table[sf.type](sf.name, ...sf.args);
                    typeof sf.extra === 'function' ? sf.extra(cb) : null;
                });
            }));
        }
        else {
            p = Promise.resolve();
        }
        return p.then(() => {
            this._synced = true;
            setInterval(this.gc.bind(this), this._options.gc_interval);
        });
    }
    get(sid) {
        return this.connect().then(() => {
            return this._knex(this._options.table_name)
                .where(this._options.sid_name, sid)
                .andWhere(this._options.expire_at_name, '>', Date.now())
                .limit(1)
                .then(rows => {
                if (rows && rows.length > 0) {
                    let row = rows[0];
                    let _a = this._options.sid_name, sid = row[_a], _b = this._options.additional_name, additional = row[_b], schemas_session = __rest(row, [typeof _a === "symbol" ? _a : _a + "", typeof _b === "symbol" ? _b : _b + ""]);
                    additional = JSON.parse(additional || '{}');
                    return Object.assign({}, additional, schemas_session);
                }
                return null;
            });
        });
    }
    set(sid, sess, max_age = this._options.max_age) {
        return this.connect().then(() => {
            let expire_at = Date.now() + Math.max(max_age, 0);
            let additional = Object.assign({}, sess, this._filter_static_field);
            let update_data = { [this._options.additional_name]: JSON.stringify(additional), [this._options.expire_at_name]: expire_at };
            this._options.schemas.forEach(sf => update_data[sf.name] = sess[sf.name]);
            return this._knex(this._options.table_name)
                .where(this._options.sid_name, sid)
                .then((rows) => {
                if (rows && rows.length > 0) {
                    return this._knex(this._options.table_name)
                        .where(this._options.sid_name, sid)
                        .update(update_data);
                }
                else {
                    return this._knex(this._options.table_name)
                        .insert(Object.assign({ [this._options.sid_name]: sid }, update_data));
                }
            });
        });
    }
    destroy(sid) {
        return this.connect().then(() => {
            return this._knex(this._options.table_name)
                .where(this._options.sid_name, sid)
                .del();
        });
    }
    gc() {
        return this.connect().then(() => {
            return this._knex(this._options.table_name)
                .where(this._options.expire_at_name, '<=', Date.now())
                .del();
        });
    }
    repo() {
        return this._knex(this._options.table_name);
    }
}
exports.default = KnexSchemaSessionStore;
