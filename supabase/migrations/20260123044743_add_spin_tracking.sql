/*
  # Add Spin Session Tracking

  1. Modified Tables
    - `students`
      - Add `session_id` (uuid) - Track which draw session this student won
      
  2. New Tables
    - `draw_sessions`
      - `id` (uuid, primary key) - Unique identifier for each draw session
      - `current_spin` (integer, default 0) - Current spin number
      - `total_spins_allowed` (integer, default 10) - Maximum spins
      - `is_active` (boolean, default true) - Whether this session is active
      - `created_at` (timestamptz, default now()) - When session was created
      - `restarted_at` (timestamptz, nullable) - When session was last restarted
      
  3. Security
    - Enable RLS on `draw_sessions` table
    - Add policies for public access
*/

-- Add session_id to students table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE students ADD COLUMN session_id uuid;
  END IF;
END $$;

-- Create draw_sessions table
CREATE TABLE IF NOT EXISTS draw_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_spin integer DEFAULT 0,
  total_spins_allowed integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  restarted_at timestamptz
);

-- Enable RLS on draw_sessions
ALTER TABLE draw_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sessions
CREATE POLICY "Anyone can view sessions"
  ON draw_sessions
  FOR SELECT
  USING (true);

-- Allow public update to sessions
CREATE POLICY "Anyone can update sessions"
  ON draw_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public insert to sessions
CREATE POLICY "Anyone can insert sessions"
  ON draw_sessions
  FOR INSERT
  WITH CHECK (true);