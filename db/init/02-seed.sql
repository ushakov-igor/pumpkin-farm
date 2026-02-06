insert into public.tasks (label, task_type, goal, reward)
values
  ('Посади 3 тыквы', 'plant', 3, 5),
  ('Собери 2 тыквы', 'harvest', 2, 8),
  ('Посади 5 тыкв', 'plant', 5, 12),
  ('Собери 4 тыквы', 'harvest', 4, 16);
on conflict (label, task_type) do nothing;
