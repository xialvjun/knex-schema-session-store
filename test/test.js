import test from 'ava';

import Knex from 'knex';
import Store from '../lib';

test(async t => {
    debugger;
    let kn = Knex('mysql://root:root@localhost/test');
    let store = new Store(kn, {
        schemas: [{
            name: 'user_id',
            type: 'string',
            // args: [],
            // extra: cb=>cb.notNullable(),
        }]
    });
    await store.connect();
    await store.clear();
    let s1 = await store.get(1);
    t.falsy(s1, `There shouldn't be s1...`);
    console.log(s1);

    await store.set(1, { user_id: '123', name: 'xialvjun', roles: ['admin', 'group'] });
    s1 = await store.get(1);
    console.log('');
    console.log(s1);
    t.deepEqual(s1, {user_id: '123', name: 'xialvjun', roles: ['admin', 'group'] });

    await store.set(1, { user_id: 45678, name: 'balabala', jk: 'jk' });
    s1 = await store.get(1);
    console.log('');
    console.log(s1);
    // we can set the user_id with a number, but we'll get it as a string since `user_id` column type is string
    t.deepEqual(s1, { user_id: '45678', name: 'balabala', jk: 'jk' });

    await store.set(1, { name: 'balabala224', jk: 'jk' });
    s1 = await store.get(1);
    console.log('');
    console.log(s1);
    //  user_id is null since it is nullable. It won't be undefined.
    t.deepEqual(s1, { user_id: null, name: 'balabala224', jk: 'jk' });

    await store.set(1, { user_id: null, name: 'balabala224', jk: 'jk' });
    s1 = await store.get(1);
    console.log('');
    console.log(s1);
    t.deepEqual(s1, { user_id: null, name: 'balabala224', jk: 'jk' });

});
