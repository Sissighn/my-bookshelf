import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, expect, test } from 'vitest'

const alice = '00000000-0000-4000-8000-000000000001'
const bob = '00000000-0000-4000-8000-000000000002'
const mfaUser = '00000000-0000-4000-8000-000000000003'
let db

beforeAll(async () => {
  db = new PGlite()
  // The migration runs unchanged against PostgreSQL. Supply Supabase's auth tables and JWT helpers locally.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create table auth.mfa_factors (user_id uuid references auth.users, status text);
    create function auth.jwt() returns jsonb language sql stable as $$
      select current_setting('request.jwt.claims', true)::jsonb;
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select (auth.jwt() ->> 'sub')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated;
  `)
  const migration = new URL('../../supabase/migrations/202611210001_private_bookshelves.sql', import.meta.url)
  await db.exec(await readFile(migration, 'utf8'))
  await db.query('insert into auth.users (id) values ($1), ($2), ($3)', [alice, bob, mfaUser])
  await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'unverified'), ($2, 'verified')", [alice, mfaUser])
  await db.query(`insert into public.bookshelves (user_id, library) values
    ($1, '{"books":["Alice"]}'), ($2, '{"books":["Bob"]}'), ($3, '{"books":["MFA"]}')`, [alice, bob, mfaUser])
}, 20000)

afterAll(async () => { await db?.close() })

async function as(role, user, assurance, action) {
  await db.exec(`set role ${role}`)
  try {
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user, aal: assurance })])
    return await action()
  } finally {
    await db.exec('reset role')
  }
}

test('anonymous requests cannot read or write bookshelf rows', async () => {
  await as('anon', null, null, async () => {
    await expect(db.query('select * from public.bookshelves')).rejects.toMatchObject({ code: '42501' })
    await expect(db.query(`insert into public.bookshelves values ($1, '{"books":[]}', 1)`, [alice])).rejects.toMatchObject({ code: '42501' })
  })
})

test('a signed-in user operates only on their own bookshelf and cannot change its owner', async () => {
  await as('authenticated', alice, 'aal1', async () => {
    expect((await db.query('select user_id from public.bookshelves')).rows).toEqual([{ user_id: alice }])
    expect((await db.query('update public.bookshelves set revision = 2 where user_id = $1 returning revision', [alice])).rows).toEqual([{ revision: 2 }])
    expect((await db.query('update public.bookshelves set revision = 2 where user_id = $1 returning revision', [bob])).rows).toEqual([])
    await expect(db.query('update public.bookshelves set user_id = $1 where user_id = $2', [bob, alice])).rejects.toMatchObject({ code: '42501' })
    await expect(db.query('delete from public.bookshelves')).rejects.toMatchObject({ code: '42501' })
  })
  const newOwner = '00000000-0000-4000-8000-000000000004'
  await db.query('insert into auth.users values ($1)', [newOwner])
  await as('authenticated', alice, 'aal1', async () => {
    await expect(db.query(`insert into public.bookshelves (user_id, library) values ($1, '{"books":[]}')`, [newOwner])).rejects.toMatchObject({ code: '42501' })
  })
  await as('authenticated', newOwner, 'aal1', async () => {
    const created = await db.query(`insert into public.bookshelves (user_id, library) values ($1, '{"books":[]}') returning user_id, revision`, [newOwner])
    expect(created.rows).toEqual([{ user_id: newOwner, revision: 1 }])
  })
})

test('requires AAL2 to access the shelf after a verified factor is enrolled', async () => {
  await as('authenticated', mfaUser, 'aal1', async () => {
    expect((await db.query('select user_id from public.bookshelves')).rows).toEqual([])
    expect((await db.query('update public.bookshelves set revision = 2 returning revision')).rows).toEqual([])
  })
  await as('authenticated', mfaUser, 'aal2', async () => {
    expect((await db.query('select user_id from public.bookshelves')).rows).toEqual([{ user_id: mfaUser }])
    expect((await db.query('update public.bookshelves set revision = 2 returning revision')).rows).toEqual([{ revision: 2 }])
  })
})

test('enforces the library and revision constraints', async () => {
  for (const json of ['[]', '{}', '{"books":{}}']) {
    await expect(db.query('update public.bookshelves set library = $1 where user_id = $2', [json, bob])).rejects.toMatchObject({ code: '23514' })
  }
  await expect(db.query('update public.bookshelves set revision = 0 where user_id = $1', [bob])).rejects.toMatchObject({ code: '23514' })
})
