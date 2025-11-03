export interface Drink {
  id: number;
  day_id: number;
  drink_type: string;
  consumed: number;
  checked_off: number;
  created_at: string;
}

export interface Meal {
  id: number;
  day_id: number;
  meal_type: string;
  meal_name: string;
  created_at: string;
}

export interface Day {
  id: number;
  date: string;
  max_drinks: number;
  went_to_gym: number;
  created_at: string;
  updated_at: string;
  drinks: Drink[];
  meals: Meal[];
}

