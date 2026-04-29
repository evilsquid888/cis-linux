// Assembler — combines per-lesson data files into the LESSONS registry.
// Each LESSON_NN global is loaded by its own <script> tag before this file.
// Missing lessons are silently skipped (graceful degradation).

const LESSONS = [
  typeof LESSON_00 !== "undefined" ? LESSON_00 : null,
  typeof LESSON_01 !== "undefined" ? LESSON_01 : null,
  typeof LESSON_02 !== "undefined" ? LESSON_02 : null,
  typeof LESSON_03 !== "undefined" ? LESSON_03 : null,
  typeof LESSON_04 !== "undefined" ? LESSON_04 : null,
  typeof LESSON_05 !== "undefined" ? LESSON_05 : null,
  typeof LESSON_06 !== "undefined" ? LESSON_06 : null,
  typeof LESSON_07 !== "undefined" ? LESSON_07 : null,
  typeof LESSON_08 !== "undefined" ? LESSON_08 : null,
  typeof LESSON_09 !== "undefined" ? LESSON_09 : null
].filter(Boolean);

// Convenience lookup
const LESSONS_BY_ID = LESSONS.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

// Hardening lessons used by judgment thresholds (Section 7 of spec)
const HARDENING_LESSON_IDS = ["02-ssh", "03-ufw", "04-user-audit", "06-stig-ssh-crypto", "07-stig-password-lockout"];
