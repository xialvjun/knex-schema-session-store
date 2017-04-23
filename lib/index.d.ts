/// <reference types="knex" />
import * as Knex from 'knex';
declare class KnexSchemaSessionStore {
    private _knex;
    private _options;
    private _synced;
    private _filter_static_field;
    constructor(knex: Knex, options?: Options);
    connect(): Promise<any>;
    get(sid: any): Promise<any>;
    set(sid: string, sess: any, max_age?: number): Promise<any>;
    destroy(sid: any): Promise<any>;
    gc(): Promise<any>;
    repo(): Knex.QueryBuilder;
}
export default KnexSchemaSessionStore;
export interface Options {
    table_name?: string;
    sid_name?: string;
    expire_at_name?: string;
    additional_name?: string;
    timestamps?: boolean;
    sync?: boolean;
    gc_interval?: number;
    max_age?: number;
    schemas?: SchemaField[];
}
export interface SchemaField {
    name: string;
    type: string;
    args?: any[];
    extra?: (cb: Knex.ColumnBuilder) => void;
}
