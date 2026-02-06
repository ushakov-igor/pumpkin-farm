create role anon nologin;
create role authenticator noinherit login password 'postgres';

grant anon to authenticator;

grant usage on schema public to anon;

grant select, insert, update, delete on all tables in schema public to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to anon;
