-- Add fields to the existing Telegram account; never rewrite existing rows.
BEGIN;
ALTER TABLE public.auction_users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_country text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS residence_address jsonb,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS mailing_address jsonb,
  ADD COLUMN IF NOT EXISTS mailing_same_as_residence boolean NOT NULL DEFAULT false;

DO $privacy$
DECLARE
  account_table CONSTANT regclass := 'public.auction_users'::regclass;
  private_names CONSTANT text[] := ARRAY['email','phone','phone_country','full_name','residence_address','postal_code','mailing_address','mailing_same_as_residence'];
  account_type oid;
  private_columns text;
  public_columns text;
  definition text;
  target_role text;
  privilege_name text;
  item record;
  column_item record;
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) AS wanted(name)
             WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=wanted.name)) THEN
    RAISE EXCEPTION 'This migration requires the existing Supabase anon, authenticated and service_role roles';
  END IF;
  SELECT reltype INTO account_type FROM pg_class WHERE oid=account_table;
  -- ADD IF NOT EXISTS leaves old columns intact; reject incompatible storage.
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
    JOIN pg_type base ON base.oid=CASE WHEN t.typbasetype=0 THEN t.oid ELSE t.typbasetype END
    WHERE a.attrelid=account_table AND a.attname=ANY(private_names) AND NOT a.attisdropped
      AND NOT (CASE
        WHEN a.attname IN ('residence_address','mailing_address') THEN base.typname IN ('json','jsonb')
        WHEN a.attname='mailing_same_as_residence' THEN base.typname='bool'
        ELSE base.typcategory='S'
      END)
  ) THEN
    RAISE EXCEPTION 'Existing personal-information column types need review; no existing type or value was changed';
  END IF;
  SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) FILTER (WHERE attname=ANY(private_names)),
         string_agg(quote_ident(attname),',' ORDER BY attnum) FILTER (WHERE NOT attname=ANY(private_names))
    INTO private_columns,public_columns
    FROM pg_attribute WHERE attrelid=account_table AND attnum>0 AND NOT attisdropped;

  -- SECURITY DEFINER RPCs can bypass column grants. Refuse unsafe known shapes
  -- instead of changing the working registration/authentication functions.
  FOR item IN
    SELECT p.oid,p.oid::regprocedure::text AS label,p.prorettype
    FROM pg_proc p
    WHERE p.prokind='f'
      AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
      AND position('auction_users' IN lower(pg_get_functiondef(p.oid)))>0
  LOOP
    definition:=lower(pg_get_functiondef(item.oid));
    IF item.prorettype=account_type
      OR definition ~ '(^|[^a-z_0-9])(email|phone|phone_country|full_name|residence_address|postal_code|mailing_address|mailing_same_as_residence)([^a-z_0-9]|$)'
      OR definition ~ '(select|returning)[[:space:]]+([a-z_][a-z_0-9]*[.])?[*]'
      OR definition ~ '(row_to_json|to_jsonb|json_agg|jsonb_agg)[[:space:]]*[(]'
    THEN
      RAISE EXCEPTION 'Personal information may be exposed or modified by legacy RPC: %',item.label
        USING HINT='Audit this pre-existing RPC before applying the migration; this migration does not rewrite auth, registration or identity.';
    END IF;
  END LOOP;

  -- Views execute with owner privileges unless explicitly configured otherwise.
  FOR item IN
    SELECT c.oid,c.oid::regclass::text AS label FROM pg_class c
    WHERE c.relkind IN ('v','m')
      AND (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'SELECT')
        OR EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
                   AND (has_column_privilege('anon',c.oid,a.attnum,'SELECT') OR has_column_privilege('authenticated',c.oid,a.attnum,'SELECT'))))
      AND EXISTS (SELECT 1 FROM pg_rewrite w JOIN pg_depend d ON d.objid=w.oid AND d.classid='pg_rewrite'::regclass
                  WHERE w.ev_class=c.oid AND d.refclassid='pg_class'::regclass AND d.refobjid=account_table)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_rewrite w JOIN pg_depend d ON d.objid=w.oid AND d.classid='pg_rewrite'::regclass
               JOIN pg_attribute a ON a.attrelid=account_table AND a.attnum=d.refobjsubid
               WHERE w.ev_class=item.oid AND d.refclassid='pg_class'::regclass AND d.refobjid=account_table AND a.attname=ANY(private_names))
      OR EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=item.oid AND a.attnum>0 AND NOT a.attisdropped AND a.atttypid=account_type)
      OR lower(pg_get_viewdef(item.oid,true)) ~ '(row_to_json|to_jsonb|json_agg|jsonb_agg)[[:space:]]*[(]'
    THEN
      RAISE EXCEPTION 'Personal information may be exposed by legacy view: %',item.label;
    END IF;
  END LOOP;

  -- Table-level SELECT/INSERT/UPDATE implicitly include new columns. Convert
  -- only grants reachable by browser roles to equivalent legacy-column grants.
  -- RESTRICT is intentional: do not cascade-delete delegated legacy grants.
  FOR item IN
    SELECT acl.* FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) acl
    WHERE c.oid=account_table AND acl.privilege_type IN ('SELECT','INSERT','UPDATE')
      AND acl.grantee<>c.relowner
      AND (acl.grantee=0 OR acl.grantee IN
        (SELECT oid FROM pg_roles WHERE pg_has_role('anon',oid,'MEMBER') OR pg_has_role('authenticated',oid,'MEMBER')))
  LOOP
    target_role:=CASE WHEN item.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(item.grantee)) END;
    EXECUTE format('REVOKE %s ON TABLE public.auction_users FROM %s RESTRICT',item.privilege_type,target_role);
    EXECUTE format('GRANT %s (%s) ON TABLE public.auction_users TO %s%s',
      item.privilege_type,public_columns,target_role,CASE WHEN item.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
  END LOOP;
  -- Remove old explicit sensitive-column grants as well as broad table grants.
  FOR item IN
    SELECT 'PUBLIC'::text AS target
    UNION ALL SELECT quote_ident(rolname) FROM pg_roles
      WHERE pg_has_role('anon',oid,'MEMBER') OR pg_has_role('authenticated',oid,'MEMBER')
  LOOP
    EXECUTE format('REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s) ON TABLE public.auction_users FROM %2$s RESTRICT',private_columns,item.target);
  END LOOP;
  EXECUTE format('GRANT SELECT (%1$s), UPDATE (%1$s) ON TABLE public.auction_users TO service_role',private_columns);

  -- Fail closed if ownership, inherited grants or another ACL still gives a
  -- browser role access; the transaction rolls back every preceding change.
  FOREACH target_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOR column_item IN SELECT attnum,attname FROM pg_attribute
      WHERE attrelid=account_table AND attnum>0 AND NOT attisdropped AND attname=ANY(private_names)
    LOOP
      FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE'] LOOP
        IF has_column_privilege(target_role,account_table,column_item.attnum,privilege_name) THEN
          RAISE EXCEPTION 'Unsafe personal-column permission remains: % % %',target_role,privilege_name,column_item.attname;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$privacy$;
NOTIFY pgrst,'reload schema';
COMMIT;
