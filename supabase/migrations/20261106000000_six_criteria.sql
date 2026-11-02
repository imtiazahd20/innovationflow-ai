-- Scoring update: challenges that still use the ORIGINAL five default criteria get the new
-- six-category set (adds "Scalability"; weights re-balanced to total 100).
-- Challenges whose owners changed their criteria are left alone.
-- Existing criterion rows are updated in place, so scores already given are kept.
-- Safe to run more than once.

with old_default as (
  select c.challenge_id
  from public.judging_criteria c
  group by c.challenge_id
  having count(*) = 5
     and bool_and((c.name, c.weight) in (
       ('Impact', 30), ('Feasibility', 25), ('Creativity', 20), ('Business value', 15), ('Clarity of pitch', 10)))
     and count(distinct c.name) = 5
)
, new_weights(name, weight, position) as (
  values ('Impact', 25, 0), ('Feasibility', 20, 1), ('Creativity', 15, 2), ('Business value', 15, 3), ('Clarity of pitch', 10, 5)
)
, upd as (
  update public.judging_criteria c
     set weight = n.weight, position = n.position
    from new_weights n
   where c.name = n.name
     and c.challenge_id in (select challenge_id from old_default)
  returning c.challenge_id
)
insert into public.judging_criteria (challenge_id, name, description, weight, position)
select distinct u.challenge_id, 'Scalability',
       'Whether the idea can grow beyond a first pilot to more teams, customers or markets.', 15, 4
from upd u;

notify pgrst, 'reload schema';
