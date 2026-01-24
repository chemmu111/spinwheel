/*
  # Lucky Draw Students Table

  1. New Tables
    - `students`
      - `id` (uuid, primary key) - Unique identifier for each student
      - `coupon_number` (integer, unique, not null) - Coupon number from 101 to 131
      - `name` (text, not null) - Student's full name
      - `phone` (text, not null) - Student's phone number
      - `photo_url` (text, not null) - URL to student's photo in Supabase Storage
      - `is_winner` (boolean, default false) - Whether student has won
      - `won_at` (timestamptz, nullable) - Timestamp when student won
      - `created_at` (timestamptz, default now()) - When the record was created

  2. Security
    - Enable RLS on `students` table
    - Add policy for public read access (for lucky draw display)
    - Add policy for insert/update operations (for admin functions)
    
  3. Constraints
    - Coupon numbers must be unique and between 101 and 131
    - Maximum 31 students can be added
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_number integer UNIQUE NOT NULL CHECK (coupon_number >= 101 AND coupon_number <= 131),
  name text NOT NULL,
  phone text NOT NULL,
  photo_url text NOT NULL,
  is_winner boolean DEFAULT false,
  won_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for lucky draw display)
CREATE POLICY "Anyone can view students"
  ON students
  FOR SELECT
  USING (true);

-- Allow public insert (for admin adding students)
CREATE POLICY "Anyone can insert students"
  ON students
  FOR INSERT
  WITH CHECK (true);

-- Allow public update (for marking winners)
CREATE POLICY "Anyone can update students"
  ON students
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index for faster winner queries
CREATE INDEX IF NOT EXISTS idx_students_is_winner ON students(is_winner);
CREATE INDEX IF NOT EXISTS idx_students_coupon_number ON students(coupon_number);