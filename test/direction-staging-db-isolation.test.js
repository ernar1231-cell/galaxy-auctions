'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {databaseConfig}=require('../api/_direction-database-config');
test('staging refuses missing staging service key instead of production fallback',()=>{
 assert.throws(()=>databaseConfig({GALAXY_STAGING_MODE:'true',GALAXY_STAGING_SUPABASE_URL:'https://staging.supabase.co',SUPABASE_URL:'https://production.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'production-secret'}),/STAGING_DATABASE_NOT_CONFIGURED/);
});
test('staging refuses production URL',()=>{
 assert.throws(()=>databaseConfig({GALAXY_STAGING_MODE:'true',GALAXY_STAGING_SUPABASE_URL:'https://same.supabase.co',GALAXY_STAGING_SERVICE_ROLE_KEY:'staging-secret',SUPABASE_URL:'https://same.supabase.co'}),/STAGING_DATABASE_MUST_BE_ISOLATED/);
});
test('staging uses only staging credentials',()=>{
 assert.deepEqual(databaseConfig({GALAXY_STAGING_MODE:'true',GALAXY_STAGING_SUPABASE_URL:'https://stage.supabase.co',GALAXY_STAGING_SERVICE_ROLE_KEY:'stage-key',SUPABASE_URL:'https://prod.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'prod-key'}),{url:'https://stage.supabase.co',key:'stage-key'});
});
