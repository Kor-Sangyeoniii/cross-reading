"""Run after cr002.sql, only against its disposable Docker fixture database."""
import subprocess
import concurrent.futures
import time

BASE = ['docker', 'exec', 'cr002-review', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'cr002_test', '-Atc']

def sql(query):
    return subprocess.run(BASE + [query], text=True, capture_output=True)

room = '20000000-0000-0000-0000-000000000001'
setup = sql(f"""
insert into rooms(id) values ('{room}');
insert into room_members(room_id,user_id,calculation_consent_version)
select '{room}', id, 'fixture-v1' from auth.users where right(id::text,1) in ('2','3','4');
""")
assert setup.returncode == 0, setup.stderr
# The first transaction holds the parent lock while a second attempts the fifth seat.
first = subprocess.Popen(BASE + [f"""set application_name='cr002-first'; begin;
insert into room_members(room_id,user_id,calculation_consent_version)
values('{room}','00000000-0000-0000-0000-000000000005','fixture-v1');
select pg_sleep(2); commit;"""], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
for _ in range(50):
    sleeping = sql("select count(*) from pg_stat_activity where application_name='cr002-first' and wait_event='PgSleep'")
    if sleeping.stdout.strip() == '1':
        break
    time.sleep(0.02)
else:
    raise AssertionError('First transaction never reached the locked waiting state')
with concurrent.futures.ThreadPoolExecutor() as pool:
    second = pool.submit(sql, f"""insert into room_members(room_id,user_id,calculation_consent_version)
values('{room}','00000000-0000-0000-0000-000000000006','fixture-v1');""")
    first.communicate(timeout=15)
    other = second.result(timeout=15)
assert sorted([first.returncode, other.returncode]).count(0) == 1, 'Exactly one of two racing joins must succeed'
check = sql(f"select member_count,(select count(*) from room_members where room_id='{room}') from rooms where id='{room}'")
assert check.stdout.strip() == '4|4', check.stdout
assert sql(f"delete from rooms where id='{room}'").returncode == 0
print('PASS: two concurrent joins compete for one seat; exactly one succeeds; count=4')
