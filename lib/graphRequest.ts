// Solver tabs වලින් Graph tab එකට යවන ඉල්ලීම
export type GraphRequest = {
  id: number; // එකම equation නැවත යවද්දීත් වෙනස් වෙන්න
  expr: string; // y = expr
  expr2?: string; // දෙවෙනි රේඛාව / වක්‍රය (සමගාමී සඳහා)
};