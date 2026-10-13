'use strict';
// Preview must never silently fall back to the production Supabase credentials.
function databaseConfig(env=process.env){
 if(env.GALAXY_STAGING_MODE==='true'){
  const url=String(env.GALAXY_STAGING_SUPABASE_URL||'').replace(/\\/$/,'');
  const key=env.GALAXY_STAGING_SERVICE_ROLE_KEY;
  if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw Error('STAGING_DATABASE_NOT_CONFIGURED');
  if(url===String(env.SUPABASE_URL||'').replace(/\\/$/,''))throw Error('STAGING_DATABASE_MUST_BE_ISOLATED');
  return {url,key};
 }
 return {url:String(env.SUPABASE_URL||'').replace(/\\/$/,''),key:env.SUPABASE_SERVICE_ROLE_KEY};
}
module.exports={databaseConfig};
