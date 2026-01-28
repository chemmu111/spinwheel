/*
  # Add Win Spin Number Tracking

  1. Modified Tables
    - `students`
      - Add `win_spin_number` (integer, nullable) - Records which spin # this student won on (1-10)
      
  2. Purpose
    - Track the exact sequence/order in which students won during the lucky draw
    - Allows displaying winners in chronological order from the live event
    - Persists across page refreshes and session restarts
    - Ensures accurate historical record of winner selection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'win_spin_number'
  ) THEN
    ALTER TABLE students ADD COLUMN win_spin_number integer;
  END IF;
END $$;
