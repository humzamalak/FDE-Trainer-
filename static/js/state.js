// Shared app state. Modules read and change it; nothing else is global.

export const state = {
  curriculum: [],
  tutorReady: false,
  progress: { lessons: {}, exercises: {}, quizzes: {}, written: {}, last_lesson: null, activity: {}, srs: {}, time: { days: {}, lessons: {} } },
  lesson: null,      // the open lesson
  chats: {},         // tutor chat history per context key
  chatKey: "general",
};

export const lessonDone = (id) => !!state.progress.lessons[id];
export const allLessons = () => state.curriculum.flatMap((t) => t.lessons);

export function studiedLessons() {
  return allLessons().filter((l) =>
    lessonDone(l.id) || Object.entries(state.progress.exercises).some(([k, v]) => k.startsWith(l.id + "#") && v?.passed));
}
