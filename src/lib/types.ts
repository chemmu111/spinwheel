export interface Student {
  id: string;
  coupon_number: number;
  name: string;
  phone: string;
  photo_url: string;
  is_winner: boolean;
  won_at: string | null;
  win_spin_number: number | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      students: {
        Row: Student;
        Insert: Omit<Student, 'id' | 'created_at' | 'is_winner' | 'won_at' | 'win_spin_number'> & {
          is_winner?: boolean;
          won_at?: string | null;
          win_spin_number?: number | null;
        };
        Update: Partial<Student>;
      };
    };
  };
}


