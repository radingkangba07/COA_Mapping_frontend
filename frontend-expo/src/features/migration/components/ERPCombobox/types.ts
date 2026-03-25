export interface ERPItem {
  id: string;
  name: string;
  description: string;
  fields?: readonly { id: string; name: string }[];
}
