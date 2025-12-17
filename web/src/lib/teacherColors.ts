// Teacher color palette
export const TEACHER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#ef4444', // red
  '#6366f1', // indigo
];

/**
 * Generates a consistent color for a teacher based on their ID
 * This ensures the same teacher always gets the same color
 */
export function getTeacherColor(teacherId: string): string {
  // Simple hash function to convert string ID to a number
  let hash = 0;
  for (let i = 0; i < teacherId.length; i++) {
    const char = teacherId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value and modulo to get a consistent index
  const index = Math.abs(hash) % TEACHER_COLORS.length;
  return TEACHER_COLORS[index];
}

/**
 * Creates a color map for a list of teachers
 * Each teacher gets a consistent color based on their ID
 */
export function createTeacherColorMap(teachers: Array<{ _id: string }>): Map<string, string> {
  const colorMap = new Map<string, string>();

  teachers.forEach((teacher) => {
    colorMap.set(teacher._id, getTeacherColor(teacher._id));
  });

  return colorMap;
}
