export interface Novel {
  id: number;
  title: string;
  author: string;
  description: string;
  created_at: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: number;
  novel_id: number;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
}
