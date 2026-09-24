-- Enforce the 1-5 rating range at the database level.
-- Prisma's schema language has no CHECK-constraint syntax, so this is applied
-- as hand-written SQL. Application-level validation still rejects bad values
-- first with a friendly message; this is the backstop that guarantees no route,
-- script, or manual query can ever store an out-of-range rating.
ALTER TABLE `ratings`
  ADD CONSTRAINT `chk_ratings_value_range` CHECK (`value` BETWEEN 1 AND 5);
