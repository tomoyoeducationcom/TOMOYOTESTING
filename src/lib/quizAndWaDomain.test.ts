import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_WHATSAPP_TARGET, FONNTE_SENDER_NUMBER } from './domain';
import { getSeoForPath, PUBLIC_INDEXABLE_ROUTES } from './seo';
import {
  INITIAL_SAMPLE_QUIZZES,
  INITIAL_WA_TEMPLATES,
  WA_TEMPLATE_CATEGORIES,
  WA_TEMPLATE_VARIABLES,
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
  type WaCampaignRecord,
} from './quizAndWaDomain';

test('Fonnte sender device number is distinct from Admin recipient target', () => {
  assert.equal(FONNTE_SENDER_NUMBER, '6283121902760');
  assert.equal(ADMIN_WHATSAPP_TARGET, '6281996284733');
  assert.notEqual(FONNTE_SENDER_NUMBER, ADMIN_WHATSAPP_TARGET);
});

test('SEO includes /kuis and dynamic /kuis/:quizId as indexable public routes', () => {
  assert.ok(PUBLIC_INDEXABLE_ROUTES.some((r) => r.path === '/kuis'));
  assert.equal(getSeoForPath('/kuis').indexable, true);
  assert.equal(getSeoForPath('/kuis/kuis-calistung-dasar').indexable, true);
});

test('toStudentSafeQuiz strictly strips answer keys and explanations', () => {
  const sample = INITIAL_SAMPLE_QUIZZES[0];
  const safe = toStudentSafeQuiz(sample);
  assert.equal(safe.questionCount, 4);
  assert.equal(safe.totalPoints, 100);
  for (const q of safe.questions) {
    assert.equal('correctOptionId' in q, false);
    assert.equal('explanation' in q, false);
  }
});

test('gradeQuizSubmission computes weighted score, counts, and percentage accurately', () => {
  const sample = INITIAL_SAMPLE_QUIZZES[0];
  const result = gradeQuizSubmission(
    sample,
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

  const valid = validateQuizPayload(INITIAL_SAMPLE_QUIZZES[0]);
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

  const quizCsv = buildQuizAttemptsCsv(INITIAL_SAMPLE_QUIZZES[0], []);
  assert.ok(quizCsv.includes('Nama Siswa'));
});
