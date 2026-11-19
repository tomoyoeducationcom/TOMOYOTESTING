import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_WHATSAPP_TARGET, FONNTE_SENDER_NUMBER } from './domain';
import { getSeoForPath, PUBLIC_INDEXABLE_ROUTES } from './seo';
import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_SAMPLE_QUIZZES,
  INITIAL_WA_TEMPLATES,
  WA_TEMPLATE_CATEGORIES,
  WA_TEMPLATE_VARIABLES,
  buildAllQuizAttemptsCsv,
  buildCampaignReportCsv,
  buildQuizAttemptsCsv,
  checkQuizAvailability,
  countMatchingAttempts,
  deduplicateAndFilterRecipients,
  gradeQuizSubmission,
  parseContactsCsvText,
  recalculateCampaignCounts,
  renderTemplateVariables,
  toStudentSafeQuiz,
  validateQuizPayload,
  type QuizAttemptRecord,
  type QuizDefinition,
  type WaCampaignRecord,
} from './quizAndWaDomain';
import {
  deleteAdminQuiz,
  deleteAdminQuizAttempt,
  listAdminQuizzes,
  listAllAdminQuizAttempts,
  listPublicQuizzes,
  startStudentQuizSession,
  submitStudentQuizAttempt,
  upsertAdminQuiz,
} from '../server/quizService';

const TEST_QUIZ_FIXTURE: QuizDefinition = {
  id: 'kuis-uji-matematika',
  title: 'Evaluasi Matematika Uji',
  description: 'Kuis uji unit domain.',
  instructions: 'Pilih satu jawaban.',
  targetClass: 'Kelas 1 SD',
  status: 'published',
  timeLimitMinutes: 15,
  maxAttempts: 3,
  questions: [
    {
      id: 'q1',
      order: 1,
      type: 'multiple_choice',
      prompt: 'Hasil penjumlahan dari 7 + 5 adalah ...',
      options: [
        { id: 'a', text: '11' },
        { id: 'b', text: '12' },
        { id: 'c', text: '13' },
        { id: 'd', text: '14' },
      ],
      points: 25,
      correctOptionId: 'b',
      explanation: '7 ditambah 5 sama dengan 12.',
    },
    {
      id: 'q2',
      order: 2,
      type: 'multiple_choice',
      prompt: 'Manakah kata yang diawali dengan huruf B?',
      options: [
        { id: 'a', text: 'Apel' },
        { id: 'b', text: 'Bola' },
        { id: 'c', text: 'Meja' },
        { id: 'd', text: 'Kursi' },
      ],
      points: 25,
      correctOptionId: 'b',
      explanation: 'Kata Bola diawali huruf B.',
    },
    {
      id: 'q3',
      order: 3,
      type: 'true_false',
      prompt: 'Angka 15 lebih besar daripada angka 12.',
      options: [
        { id: 'true', text: 'Benar' },
        { id: 'false', text: 'Salah' },
      ],
      points: 25,
      correctOptionId: 'true',
      explanation: '15 berada setelah 12.',
    },
    {
      id: 'q4',
      order: 4,
      type: 'multiple_choice',
      prompt: 'Sisa dari 9 - 3 adalah ...',
      options: [
        { id: 'a', text: '5' },
        { id: 'b', text: '6' },
        { id: 'c', text: '7' },
        { id: 'd', text: '12' },
      ],
      points: 25,
      correctOptionId: 'b',
      explanation: '9 dikurangi 3 sama dengan 6.',
    },
  ],
  createdAtIso: '2026-11-01T08:00:00.000Z',
  updatedAtIso: '2026-11-01T08:00:00.000Z',
};

test('built-in INITIAL_SAMPLE_QUIZZES is empty so no dummy/simulation quizzes appear automatically', () => {
  assert.equal(INITIAL_SAMPLE_QUIZZES.length, 0);
});

test('Fonnte sender device number is distinct from Admin recipient target', () => {
  assert.equal(FONNTE_SENDER_NUMBER, '6283121902760');
  assert.equal(ADMIN_WHATSAPP_TARGET, '6281996284733');
  assert.notEqual(FONNTE_SENDER_NUMBER, ADMIN_WHATSAPP_TARGET);
});

test('SEO includes /kuis and dynamic /kuis/:quizId as indexable public routes', () => {
  assert.ok(PUBLIC_INDEXABLE_ROUTES.some((r) => r.path === '/kuis'));
  assert.equal(getSeoForPath('/kuis').indexable, true);
  assert.equal(getSeoForPath('/kuis/kuis-matematika').indexable, true);
});

test('toStudentSafeQuiz strictly strips answer keys and explanations', () => {
  const safe = toStudentSafeQuiz(TEST_QUIZ_FIXTURE);
  assert.equal(safe.questionCount, 4);
  assert.equal(safe.totalPoints, 100);
  for (const q of safe.questions) {
    assert.equal('correctOptionId' in q, false);
    assert.equal('explanation' in q, false);
  }
});

test('gradeQuizSubmission computes weighted score, counts, and percentage accurately', () => {
  const result = gradeQuizSubmission(
    TEST_QUIZ_FIXTURE,
    {
      q1: 'b', // correct (25)
      q2: 'a', // wrong (0)
      q3: 'true', // correct (25)
      // q4 unanswered (0)
    },
    145
  );
  assert.equal(result.score, 50);
  assert.equal(result.maxScore, 100);
  assert.equal(result.percentage, 50);
  assert.equal(result.correctCount, 2);
  assert.equal(result.wrongCount, 2);
  assert.equal(result.unansweredCount, 1);
});

test('quiz availability and attempt limits enforce schedule and maxAttempts', () => {
  const active = checkQuizAvailability(
    {
      status: 'published',
      startAtIso: '2026-11-01T00:00:00.000Z',
      endAtIso: '2026-12-01T00:00:00.000Z',
    },
    new Date('2026-11-15T00:00:00.000Z')
  );
  assert.equal(active.available, true);

  const upcoming = checkQuizAvailability(
    { status: 'published', startAtIso: '2026-12-01T00:00:00.000Z' },
    new Date('2026-11-15T00:00:00.000Z')
  );
  assert.equal(upcoming.available, false);
  assert.equal(upcoming.state, 'upcoming');

  const ended = checkQuizAvailability(
    { status: 'published', endAtIso: '2026-11-01T00:00:00.000Z' },
    new Date('2026-11-15T00:00:00.000Z')
  );
  assert.equal(ended.available, false);
  assert.equal(ended.state, 'ended');

  const attempts: QuizAttemptRecord[] = [
    {
      id: 'a1',
      quizId: 'kuis-1',
      quizTitle: 'Q1',
      studentName: '  Rafi   Pratama ',
      studentClass: 'Kelas 1',
      answers: {},
      score: 100,
      maxScore: 100,
      percentage: 100,
      correctCount: 4,
      wrongCount: 0,
      unansweredCount: 0,
      durationSeconds: 60,
      startedAtIso: '2026-11-10T01:00:00Z',
      submittedAtIso: '2026-11-10T01:01:00Z',
      gradedDetails: [],
    },
  ];
  assert.equal(countMatchingAttempts(attempts, 'kuis-1', 'rafi pratama', 'kelas 1'), 1);
  assert.equal(countMatchingAttempts(attempts, 'kuis-1', 'Nadia', 'Kelas 1'), 0);
});

test('validateQuizPayload rejects invalid payloads and accepts valid quizzes', () => {
  const invalid = validateQuizPayload({
    title: 'AB',
    status: 'published',
    questions: [],
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 2);

  const valid = validateQuizPayload(TEST_QUIZ_FIXTURE);
  assert.equal(valid.valid, true);
});

test('WhatsApp template system supports 8 categories, 8 variables, and flags missing values', () => {
  assert.equal(WA_TEMPLATE_CATEGORIES.length, 8);
  assert.equal(WA_TEMPLATE_VARIABLES.length, 8);
  assert.equal(INITIAL_WA_TEMPLATES.length, 8);

  const tpl = 'Halo *{nama_orang_tua}*, ananda *{nama_siswa}* kelas {kelas} di {nama_lembaga}.';
  const missing = renderTemplateVariables(tpl, {
    nama_orang_tua: 'Ibu Siti',
    nama_siswa: '',
  });
  assert.deepEqual(missing.missingVariables, ['nama_siswa', 'kelas']);

  const complete = renderTemplateVariables(tpl, {
    nama_orang_tua: 'Ibu Siti',
    nama_siswa: 'Rafi',
    kelas: 'Kelas 1 SD',
  });
  assert.deepEqual(complete.missingVariables, []);
  assert.ok(complete.rendered.includes('TOMOYO PRIVAT & BIMBEL EDUCATION'));
  assert.ok(complete.rendered.includes('Ibu Siti'));
});

test('CSV contact parsing, deduplication, and opt-out filtering work reliably', () => {
  const csv = [
    'nama,telepon,orang_tua,kelas,program',
    'Rafi Pratama,0812-3456-7890,Ibu Siti,Kelas 1,Paket 1',
    'Rafi Duplikat,+6281234567890,Ibu Siti,Kelas 1,Paket 1',
    'Anak OptOut,085611112222,Pak Budi,Kelas 4,Paket 2',
    'Nomor Salah,123,Ibu Ani,Kelas 2,Paket 2',
  ].join('\n');

  const parsed = parseContactsCsvText(csv);
  assert.equal(parsed.length, 4);

  const filtered = deduplicateAndFilterRecipients(parsed, ['6285611112222']);
  assert.equal(filtered.accepted.length, 1);
  assert.equal(filtered.accepted[0].normalizedPhone, '6281234567890');
  assert.equal(filtered.duplicates, 1);
  assert.equal(filtered.optedOut, 1);
  assert.equal(filtered.invalid.length, 1);
});

test('campaign queue recount and CSV export utilities produce valid output', () => {
  const sampleCampaign: WaCampaignRecord = {
    id: 'cmp-1',
    title: 'Uji Kampanye',
    rawMessage: 'Halo',
    status: 'running',
    totalCount: 0,
    waitingCount: 0,
    processingCount: 0,
    successCount: 0,
    failedCount: 0,
    delaySeconds: 2,
    batchSize: 5,
    maxRetries: 1,
    createdAtIso: '2026-11-18T10:00:00Z',
    updatedAtIso: '2026-11-18T10:00:00Z',
    createdByEmail: 'tomoyoeducation.com@gmail.com',
    items: [
      {
        id: 'i1',
        phone: '6281234567890',
        displayName: 'Ibu Siti',
        resolvedMessage: 'Halo',
        source: 'manual',
        status: 'berhasil',
        attempts: 1,
        variables: {},
      },
      {
        id: 'i2',
        phone: '6289876543210',
        displayName: 'Pak Budi',
        resolvedMessage: 'Halo',
        source: 'manual',
        status: 'gagal',
        attempts: 2,
        lastError: 'Device offline',
        variables: {},
      },
    ],
  };

  const recalculated = recalculateCampaignCounts(sampleCampaign);
  assert.equal(recalculated.totalCount, 2);
  assert.equal(recalculated.successCount, 1);
  assert.equal(recalculated.failedCount, 1);
  assert.equal(recalculated.status, 'completed');

  const campaignCsv = buildCampaignReportCsv(recalculated);
  assert.ok(campaignCsv.includes('Ibu Siti'));
  assert.ok(campaignCsv.includes('Device offline'));

  const quizCsv = buildQuizAttemptsCsv(TEST_QUIZ_FIXTURE, []);
  assert.ok(quizCsv.includes('Nama Siswa'));

  const allCsv = buildAllQuizAttemptsCsv([
    {
      id: 'att-1',
      quizId: TEST_QUIZ_FIXTURE.id,
      quizTitle: TEST_QUIZ_FIXTURE.title,
      studentName: 'Budi Santoso',
      studentClass: 'Kelas 4 SD',
      answers: {},
      score: 75,
      maxScore: 100,
      percentage: 75,
      correctCount: 3,
      wrongCount: 1,
      unansweredCount: 0,
      durationSeconds: 120,
      startedAtIso: '2026-11-19T01:00:00Z',
      submittedAtIso: '2026-11-19T01:02:00Z',
      gradedDetails: [],
    },
  ]);
  assert.ok(allCsv.includes('Budi Santoso'));
  assert.ok(allCsv.includes('Kelas 4 SD'));
  assert.ok(allCsv.includes('Nilai (0-100)'));
});

test('deleting all quizzes persists empty state without respawning dummy quizzes and exposes student recap', () => {
  const dataDir = path.resolve(process.cwd(), '.data');
  const quizzesPath = path.join(dataDir, 'quizzes.json');
  const attemptsPath = path.join(dataDir, 'quiz-attempts.json');
  const sessionsPath = path.join(dataDir, 'quiz-sessions.json');
  const prevQuizzes = fs.existsSync(quizzesPath) ? fs.readFileSync(quizzesPath, 'utf-8') : null;
  const prevAttempts = fs.existsSync(attemptsPath) ? fs.readFileSync(attemptsPath, 'utf-8') : null;
  const prevSessions = fs.existsSync(sessionsPath) ? fs.readFileSync(sessionsPath, 'utf-8') : null;

  try {
    const saved = upsertAdminQuiz({
      ...TEST_QUIZ_FIXTURE,
      id: 'kuis-test-persist-del',
    });
    assert.equal(saved.ok, true);
    assert.ok(listAdminQuizzes().some((q) => q.id === 'kuis-test-persist-del'));

    const session = startStudentQuizSession({
      quizId: 'kuis-test-persist-del',
      studentName: 'Nadia Kusuma',
      studentClass: 'Kelas 3 SD',
    });
    assert.equal(session.ok, true);

    const submitted = submitStudentQuizAttempt({
      quizId: 'kuis-test-persist-del',
      sessionToken: session.sessionToken,
      studentName: 'Nadia Kusuma',
      studentClass: 'Kelas 3 SD',
      answers: { q1: 'b', q2: 'b', q3: 'true', q4: 'b' },
    });
    assert.equal(submitted.ok, true);

    const recap = listAllAdminQuizAttempts();
    const nadiaAttempt = recap.find((a) => a.studentName === 'Nadia Kusuma');
    assert.ok(nadiaAttempt);
    assert.equal(nadiaAttempt.studentClass, 'Kelas 3 SD');
    assert.equal(nadiaAttempt.percentage, 100);

    // Delete individual attempt works
    assert.equal(deleteAdminQuizAttempt(nadiaAttempt.id), true);
    assert.equal(
      listAllAdminQuizAttempts().some((a) => a.id === nadiaAttempt.id),
      false
    );

    // Delete ALL existing quizzes -> must stay [] and NEVER respawn built-in quizzes
    for (const q of listAdminQuizzes()) {
      assert.equal(deleteAdminQuiz(q.id), true);
    }
    assert.equal(listAdminQuizzes().length, 0);
    assert.equal(listPublicQuizzes().length, 0);
  } finally {
    if (prevQuizzes !== null) fs.writeFileSync(quizzesPath, prevQuizzes, 'utf-8');
    else if (fs.existsSync(quizzesPath)) fs.unlinkSync(quizzesPath);

    if (prevAttempts !== null) fs.writeFileSync(attemptsPath, prevAttempts, 'utf-8');
    else if (fs.existsSync(attemptsPath)) fs.unlinkSync(attemptsPath);

    if (prevSessions !== null) fs.writeFileSync(sessionsPath, prevSessions, 'utf-8');
    else if (fs.existsSync(sessionsPath)) fs.unlinkSync(sessionsPath);
  }
});

test('question imageUrl is validated, preserved for students, and stored in graded review', () => {
  const withValidImage: QuizDefinition = {
    ...TEST_QUIZ_FIXTURE,
    id: 'kuis-uji-gambar',
    questions: [
      {
        ...TEST_QUIZ_FIXTURE.questions[0],
        imageUrl: 'https://res.cloudinary.com/fgxdx2hq/image/upload/v1/tomoyo/soal-pecahan.png',
      },
      ...TEST_QUIZ_FIXTURE.questions.slice(1),
    ],
  };

  assert.equal(validateQuizPayload(withValidImage).valid, true);

  const withUnsafeImage: QuizDefinition = {
    ...TEST_QUIZ_FIXTURE,
    questions: [
      {
        ...TEST_QUIZ_FIXTURE.questions[0],
        imageUrl: 'javascript:alert(1)',
      },
    ],
  };
  const invalidRes = validateQuizPayload(withUnsafeImage);
  assert.equal(invalidRes.valid, false);
  assert.ok(invalidRes.errors.some((e) => e.includes('URL gambar soal tidak valid')));

  const safeQuiz = toStudentSafeQuiz(withValidImage);
  assert.equal(
    safeQuiz.questions[0].imageUrl,
    'https://res.cloudinary.com/fgxdx2hq/image/upload/v1/tomoyo/soal-pecahan.png'
  );
  assert.equal(safeQuiz.questions[1].imageUrl, undefined);

  const graded = gradeQuizSubmission(withValidImage, { q1: 'b' }, 30);
  assert.equal(
    graded.gradedDetails[0].imageUrl,
    'https://res.cloudinary.com/fgxdx2hq/image/upload/v1/tomoyo/soal-pecahan.png'
  );

  const dataDir = path.resolve(process.cwd(), '.data');
  const quizzesPath = path.join(dataDir, 'quizzes.json');
  const prevQuizzes = fs.existsSync(quizzesPath) ? fs.readFileSync(quizzesPath, 'utf-8') : null;
  try {
    const saved = upsertAdminQuiz({
      ...withValidImage,
      questions: [
        {
          ...withValidImage.questions[0],
          imageUrl: '  /assets/aistudio/pngwing.com_a17ae016.png  ',
        },
        ...withValidImage.questions.slice(1),
      ],
    });
    assert.equal(saved.ok, true);
    assert.equal(saved.quiz?.questions[0].imageUrl, '/assets/aistudio/pngwing.com_a17ae016.png');
  } finally {
    if (prevQuizzes !== null) fs.writeFileSync(quizzesPath, prevQuizzes, 'utf-8');
    else if (fs.existsSync(quizzesPath)) fs.unlinkSync(quizzesPath);
  }
});

