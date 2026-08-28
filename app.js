// STORAGE_KEY di-version: naikkan ke v3 agar data/layout lama dari localStorage (yang bisa
// membuat halaman tampak "tidak berubah" saat kode sudah diperbarui) dibuang dan memakai yang baru.
const STORAGE_KEY = "nusalab-state-v3";
// Daftar halaman valid. Dipakai untuk memvalidasi activePage yang disimpan di localStorage
// dari versi lama, supaya halaman yang sudah tidak ada tidak membuat render rusak.
const VALID_PAGES = ["dashboard", "profile", "schedule", "calendar", "history", "borrow", "notifications", "requests", "maintenance", "analytics"];
const SUPABASE_URL = "https://yevzkzhxrpljptkfnvtf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_c9wUerlNBiDlx7mLZtx4DQ_t9Es8Vz6";
// Buat klien Supabase. Dibungkus try/catch supaya error di sini (mis. halaman
// dibuka lewat file://, tidak ada koneksi internet, atau CDN/versi bermasalah)
// tidak menghentikan seluruh script dan membuat halaman jadi kosong/putih.
// Nama variabel sengaja "supabaseClient" (bukan "supabase") untuk menghindari
// bentrok dengan global "supabase" yang sudah diekspos oleh script CDN Supabase,
// yang bisa memicu "Identifier 'supabase' has already been declared".
let supabaseClient = null;
try {
  supabaseClient = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) || null;
} catch (error) {
  console.error("[NusaLab] Gagal membuat klien Supabase:", error);
}
const AUTH_REDIRECT_URL = `${window.location.origin}${window.location.pathname}`;
let supabaseSession = null;
let authListenerReady = false;

// Penanda versi di console. Berguna untuk memastikan browser benar-benar memuat app.js terbaru
// (bukan dari cache). Cocokkan dengan angka ?v= di index.html.
console.info("[NusaLab] app.js v4 — jika angka ini tidak muncul, browser masih memakai app.js lama. Hard refresh (Ctrl+Shift+R) atau ganti ?v= di index.html.");

const icons = {
  lab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v6l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17L14 8V2"/><path d="M8 2h8"/><path d="M7 16h10"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="8"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="15" width="7" height="6"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 4h13L22 12v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7z"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3 3-3-3z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M8 17V9M13 17V5M18 17v-6"/></svg>',
  docs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m20 6-11 11-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
  printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
};

const initialState = {
  session: null,
  activePage: "dashboard",
  mobileOpen: false,
  authMode: "login",
  loginRole: "user",
  analyticsRange: "month",
  analyticsLabId: "all",
  toast: null,
  modal: null,
  authLoading: true,
  dataLoading: false,
  profileIncomplete: false,
  authError: "",
  remoteError: "",
  users: [
    {
      id: "u1",
      name: "Aditi Rahma",
      identity: "Mahasiswa",
      nim: "2304101011",
      phone: "0812-2345-7788",
      email: "aditi.rahma@kampus.ac.id",
      studyProgram: "Teknik Informatika",
      birthDate: "2004-04-18",
      role: "user",
      password: "demo",
      avatar: ""
    },
    {
      id: "a1",
      name: "Budi Santoso",
      identity: "Admin Laboratorium",
      nim: "ADM-001",
      phone: "0813-8888-2410",
      email: "admin.lab@kampus.ac.id",
      studyProgram: "Teknik Informatika",
      birthDate: "1989-09-21",
      role: "admin",
      password: "admin",
      avatar: ""
    }
  ],
  labs: [
    { id: "lab-hardware", name: "Lab Hardware", code: "HW", capacity: 33, location: "Gedung A Lt. 4", status: "available" },
    { id: "lab-software", name: "Lab Software", code: "SW", capacity: 37, location: "Gedung A Lt. 4", status: "available" },
    { id: "lab-a4", name: "A4 Ruang Kelas", code: "A4", capacity: 33, location: "Gedung A Lt. 4", status: "available" }
  ],
  bookings: [
    {
      id: "BK-260810-001",
      userId: "u1",
      requester: "Aditi Rahma",
      requesterType: "Mahasiswa",
      labId: "lab-software",
      date: "2026-08-12",
      start: "09:00",
      end: "11:00",
      purpose: "Praktikum Pemrograman Web",
      notes: "Membutuhkan koneksi internet stabil.",
      status: "approved",
      submittedAt: "2026-08-10 10:12",
      reviewedAt: "2026-08-10 10:45",
      adminNote: "Disetujui. Harap hadir 10 menit sebelum sesi.",
      reminder: true
    },
    {
      id: "BK-260810-002",
      userId: "u1",
      requester: "Aditi Rahma",
      requesterType: "Mahasiswa",
      labId: "lab-hardware",
      date: "2026-08-15",
      start: "13:00",
      end: "15:00",
      purpose: "Praktikum perakitan komputer",
      notes: "",
      status: "pending",
      submittedAt: "2026-08-10 11:05",
      reviewedAt: "",
      adminNote: "",
      reminder: false
    },
    {
      id: "BK-260805-004",
      userId: "u1",
      requester: "Aditi Rahma",
      requesterType: "Mahasiswa",
      labId: "lab-a4",
      date: "2026-08-05",
      start: "08:00",
      end: "10:00",
      purpose: "Pelatihan desain poster",
      notes: "",
      status: "expired",
      submittedAt: "2026-08-01 09:20",
      reviewedAt: "2026-08-01 10:00",
      adminNote: "Selesai digunakan.",
      reminder: true
    },
    {
      id: "BK-260809-003",
      userId: "external",
      requester: "Dosen Tamu Informatika",
      requesterType: "Dosen",
      labId: "lab-software",
      date: "2026-08-13",
      start: "10:00",
      end: "12:00",
      purpose: "Workshop instalasi software",
      notes: "Butuh proyektor.",
      status: "approved",
      submittedAt: "2026-08-09 14:08",
      reviewedAt: "2026-08-09 15:10",
      adminNote: "Disetujui.",
      reminder: true
    }
  ],
  maintenance: [
    {
      id: "MT-260811-001",
      labId: "lab-hardware",
      date: "2026-08-11",
      start: "08:00",
      end: "10:00",
      reason: "Pengecekan PC dan perangkat lab",
      status: "scheduled"
    }
  ],
  notifications: [
    {
      id: "N-001",
      role: "user",
      userId: "u1",
      title: "Peminjaman disetujui",
      message: "Lab Software pada 12 Agu 2026 pukul 09:00-11:00 sudah masuk Jadwal Saya.",
      time: "2026-08-10 10:45",
      unread: true,
      type: "approved"
    },
    {
      id: "N-002",
      role: "admin",
      title: "Permintaan baru",
      message: "Aditi Rahma mengajukan Lab Hardware untuk 15 Agu 2026.",
      time: "2026-08-10 11:05",
      unread: true,
      type: "pending"
    }
  ]
};

let state = loadState();

function deepClone(value) {
  if (typeof globalThis.structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const base = deepClone(initialState);
  base.session = null;
  base.users = [];
  base.bookings = [];
  base.maintenance = [];
  base.notifications = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Validasi halaman aktif: nilai dari localStorage versi lama yang sudah tidak dikenal
      // tidak boleh dipakai, supaya tidak memunculkan halaman rusak/layar putih.
      const savedPage = VALID_PAGES.includes(saved.activePage) ? saved.activePage : base.activePage;
      return {
        ...base,
        activePage: savedPage,
        mobileOpen: false,
        authMode: saved.authMode || base.authMode,
        loginRole: saved.loginRole || base.loginRole,
        analyticsRange: saved.analyticsRange || base.analyticsRange,
        analyticsLabId: saved.analyticsLabId || base.analyticsLabId
      };
    }
  } catch (error) {
    console.warn("State reset", error);
  }
  return base;
}

function mergeState(base, saved) {
  return {
    ...deepClone(base),
    ...saved,
    users: (saved.users || base.users).map((user) => ({
      ...user,
      studyProgram: user.studyProgram || "Teknik Informatika",
      password: user.password || (user.role === "admin" ? "admin" : "demo"),
      avatar: user.avatar || ""
    })),
    labs: saved.labs || base.labs,
    bookings: saved.bookings || base.bookings,
    maintenance: saved.maintenance || base.maintenance,
    notifications: saved.notifications || base.notifications
  };
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      activePage: state.activePage,
      authMode: state.authMode,
      loginRole: state.loginRole,
      analyticsRange: state.analyticsRange,
      analyticsLabId: state.analyticsLabId
    })
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error("Supabase JS belum termuat. Pastikan koneksi internet aktif dan CDN Supabase bisa diakses.");
  }
  return supabaseClient;
}

function normalizeTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function formatStamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${dateISO(date)} ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}

function authUserDefaults(user) {
  const meta = user?.user_metadata || {};
  const email = user?.email || "";
  return {
    id: user?.id || "",
    full_name: meta.full_name || meta.name || email.split("@")[0] || "",
    identity: "Mahasiswa",
    nim_nidn: "",
    phone: "",
    email,
    study_program: "",
    birth_date: "",
    role: "user",
    avatar_url: meta.avatar_url || meta.picture || ""
  };
}

function mapProfile(profile) {
  return {
    id: profile.id,
    name: profile.full_name || profile.email?.split("@")[0] || "User NusaLab",
    identity: profile.identity || (profile.role === "admin" ? "Admin Laboratorium" : "Mahasiswa"),
    nim: profile.nim_nidn || "",
    phone: profile.phone || "",
    email: profile.email || "",
    studyProgram: profile.study_program || "",
    birthDate: profile.birth_date || "",
    role: profile.role || "user",
    password: "",
    avatar: profile.avatar_url || ""
  };
}

function mapBooking(booking) {
  return {
    id: booking.id,
    userId: booking.user_id,
    requester: booking.requester,
    requesterType: booking.requester_type,
    labId: booking.lab_id,
    date: booking.booking_date,
    start: normalizeTime(booking.start_time),
    end: normalizeTime(booking.end_time),
    purpose: booking.purpose,
    notes: booking.notes || "",
    status: booking.status,
    submittedAt: booking.submitted_at || "",
    reviewedAt: booking.reviewed_at ? formatStamp(booking.reviewed_at) : "",
    reviewedBy: booking.reviewed_by || "",
    reviewedByName: booking.reviewed_by_name || "",
    adminNote: booking.admin_note || "",
    reminder: Boolean(booking.reminder),
    cancelReason: booking.cancel_reason || "",
    cancelNote: booking.cancel_note || "",
    cancelledAt: booking.cancelled_at ? formatStamp(booking.cancelled_at) : ""
  };
}

function mapMaintenance(item) {
  return {
    id: item.id,
    labId: item.lab_id,
    date: item.maintenance_date,
    start: normalizeTime(item.start_time),
    end: normalizeTime(item.end_time),
    reason: item.reason,
    status: item.status
  };
}

function mapNotification(notification) {
  return {
    id: notification.id,
    role: notification.recipient_role,
    userId: notification.user_id,
    title: notification.title,
    message: notification.message,
    time: formatStamp(notification.created_at),
    unread: notification.unread,
    type: notification.type || "info"
  };
}

function isProfileComplete(profile) {
  if (!profile) return false;
  if (profile.role === "admin") return Boolean(profile.full_name && profile.email);
  return Boolean(
    profile.full_name &&
    profile.identity &&
    profile.nim_nidn &&
    profile.phone &&
    profile.study_program &&
    profile.birth_date
  );
}

async function fetchCurrentProfile(session) {
  const client = requireSupabase();
  const defaults = authUserDefaults(session.user);
  const { data: existing, error: selectError } = await client
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        id: defaults.id,
        full_name: defaults.full_name,
        email: defaults.email,
        avatar_url: defaults.avatar_url
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function loadRemoteState(options = {}) {
  const client = requireSupabase();
  const user = getUser();
  if (!user) return;

  state.dataLoading = true;
  if (options.renderBefore) render();

  const profileQuery = state.session.role === "admin"
    ? client.from("profiles").select("*").order("full_name")
    : client.from("profiles").select("*").eq("id", state.session.userId);

  const [profilesResult, labsResult, bookingsResult, maintenanceResult, notificationsResult] = await Promise.all([
    profileQuery,
    client.from("labs").select("*").order("name"),
    client.from("bookings").select("*").order("booking_date", { ascending: false }).order("start_time", { ascending: false }),
    client.from("maintenance").select("*").order("maintenance_date", { ascending: false }).order("start_time", { ascending: false }),
    client.from("notifications").select("*").order("created_at", { ascending: false }).limit(200)
  ]);

  const firstError = [profilesResult, labsResult, bookingsResult, maintenanceResult, notificationsResult].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const profiles = profilesResult.data || [];
  const currentProfile = profiles.find((profile) => profile.id === state.session.userId);
  state.users = profiles.map(mapProfile);
  if (!state.users.find((profile) => profile.id === state.session.userId) && currentProfile) {
    state.users.unshift(mapProfile(currentProfile));
  }
  state.labs = (labsResult.data || []).map((lab) => ({
    id: lab.id,
    name: lab.name,
    code: lab.code,
    capacity: lab.capacity,
    location: lab.location,
    status: lab.status
  }));
  state.bookings = (bookingsResult.data || []).map(mapBooking);
  state.maintenance = (maintenanceResult.data || []).map(mapMaintenance);
  state.notifications = (notificationsResult.data || []).map(mapNotification);
  state.remoteError = "";
  state.dataLoading = false;
}

async function applySupabaseSession(session) {
  supabaseSession = session;
  state.authLoading = false;
  state.remoteError = "";

  if (!session) {
    state.session = null;
    state.users = [];
    state.bookings = [];
    state.maintenance = [];
    state.notifications = [];
    state.profileIncomplete = false;
    state.dataLoading = false;
    render();
    return;
  }

  try {
    state.dataLoading = true;
    render();
    const profile = await fetchCurrentProfile(session);
    state.session = { userId: profile.id, role: profile.role || "user" };
    state.users = [mapProfile(profile)];
    state.profileIncomplete = !isProfileComplete(profile);
    if (state.profileIncomplete) {
      state.authMode = "register";
      state.dataLoading = false;
      render();
      return;
    }

    await loadRemoteState();
    state.activePage = state.activePage || "dashboard";
    saveState();
    render();
  } catch (error) {
    state.dataLoading = false;
    state.remoteError = error.message || "Gagal memuat data Supabase.";
    render();
  }
}

async function initializeApp() {
  state.authLoading = true;
  render();

  try {
    const client = requireSupabase();
    if (!authListenerReady) {
      authListenerReady = true;
      client.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => applySupabaseSession(session), 0);
      });
    }

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    await applySupabaseSession(data.session);
  } catch (error) {
    state.authLoading = false;
    state.authError = error.message || "Supabase belum bisa diakses.";
    render();
  }
}

async function refreshRemoteState() {
  try {
    await loadRemoteState();
    render();
  } catch (error) {
    state.remoteError = error.message || "Gagal memuat data terbaru.";
    render();
  }
}

function icon(name) {
  return `<span class="icon" aria-hidden="true">${icons[name] || icons.dashboard}</span>`;
}

function dateISO(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function parseISODate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function todayISO() {
  return dateISO(new Date());
}

function nowStamp() {
  return `${todayISO()} ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function shortDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short"
  });
}

function timeRange(item) {
  return `${normalizeTime(item.start)}-${normalizeTime(item.end)}`;
}

function getUser() {
  return state.users.find((user) => user.id === state.session?.userId) || null;
}

function getLab(id) {
  return state.labs.find((lab) => lab.id === id) || state.labs[0];
}

function statusLabel(status) {
  const map = {
    pending: "Pending",
    approved: "Disetujui",
    rejected: "Ditolak",
    cancelled: "Dibatalkan",
    expired: "Selesai",
    maintenance: "Maintenance",
    info: "Info"
  };
  return map[status] || status;
}

function isActiveStatus(status) {
  return ["pending", "approved"].includes(status);
}

function isUpcomingDate(value) {
  return value >= todayISO();
}

// Waktu sekarang dalam format "HH:MM" (mengikuti format start_time/end_time padat 2 digit).
function nowHM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// Status waktu untuk sebuah agenda (peminjaman/maintenance) di kalender:
//   - "upcoming" → belum waktunya (bisa hari depan atau hari ini tapi jam belum mulai)
//   - "ongoing"  → SEDANG BERLANGSUNG (hari ini dan jam sekarang ada di dalam slot)
//   - "expired"  → SUDAH KADALUARSA (tanggal terlewat ATAU slot waktu hari ini sudah habis)
// arg menyesuaikan event yang punya { date, start, end }.
function eventTiming(event) {
  if (!event || !event.date) return "upcoming";
  const today = todayISO();
  const start = normalizeTime(event.start);
  const end = normalizeTime(event.end);
  if (event.date < today) return "expired";
  if (event.date > today) return "upcoming";
  // Hari ini:
  const now = nowHM();
  if (end && now >= end) return "expired";
  if (start && now >= start) return "ongoing";
  return "upcoming";
}

// Klasifikasi warna kalender berbasis status waktu (untuk peminjaman):
//   expiry → abu; hari ini tp belum jam → oren; hari ini & jam jalan → biru (berlangsung);
//   besok & seterusnya → hijau. Maintenance TIDAK dipakai (tetap merah).
function calendarTimingClass(event) {
  if (!event || !event.date) return "timing-future";
  const today = todayISO();
  if (event.date < today) return "timing-expired";
  if (event.date > today) return "timing-future";
  const now = nowHM();
  const start = normalizeTime(event.start);
  const end = normalizeTime(event.end);
  if (end && now >= end) return "timing-expired";
  if (start && now >= start) return "timing-ongoing";
  return "timing-upcoming";
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function checkAvailability(labId, date, start, end, ignoreId) {
  const bookingConflict = state.bookings.some((booking) => {
    if (booking.id === ignoreId || booking.labId !== labId || booking.date !== date) return false;
    if (!["pending", "approved"].includes(booking.status)) return false;
    return overlaps(start, end, booking.start, booking.end);
  });
  const maintenanceConflict = state.maintenance.some((item) => {
    if (item.labId !== labId || item.date !== date) return false;
    return overlaps(start, end, item.start, item.end);
  });
  return {
    available: !bookingConflict && !maintenanceConflict,
    bookingConflict,
    maintenanceConflict
  };
}

function appMetrics(role) {
  const user = getUser();
  const baseBookings = role === "admin" ? state.bookings : state.bookings.filter((item) => item.userId === user?.id);
  const upcoming = baseBookings.filter((item) => isUpcomingDate(item.date));
  const isAdmin = role === "admin";
  // Statistik USER hanya menghitung jadwal yang BELUM kadaluarsa (tanggal belum terlewat):
  //   - active  = "jadwal aktif saya" → sudah disetujui & belum kadaluarsa
  //   - pending = "menunggu" → pengajuan belum dibalas & belum kadaluarsa
  // Admin: pending menghitung semua yang belum direspons; maintenance hanya yang belum kadaluarsa.
  const countStatus = (st) => (isAdmin ? baseBookings : upcoming).filter((item) => item.status === st).length;
  return {
    pending: countStatus("pending"),
    active: upcoming.filter((item) => item.status === "approved").length,
    maintenance: state.maintenance.filter((item) => isUpcomingDate(item.date)).length
  };
}

function addNotification(notification) {
  state.notifications.unshift({
    id: `N-${Date.now()}`,
    unread: true,
    time: nowStamp(),
    ...notification
  });
}

let toastTimer = null;

function setToast(title, message, type) {
  // Tipe otomatis jika tidak diberikan: judul/pesan yang menandakan kegagalan tampil
  // dengan ikon dan warna yang sesuai, bukan ikon sukses yang menyesatkan.
  const text = `${title} ${message}`.toLowerCase();
  if (!type) {
    if (text.includes("gagal") || /\berror\b/.test(text)) type = "error";
    else if (text.includes("belum") || text.includes("tidak terkirim") || text.includes("tidak ")) type = "warning";
    else type = "success";
  }
  state.toast = { title, message, type };
  saveState();
  render();
  if (toastTimer) window.clearTimeout(toastTimer);
  const duration = type === "error" ? 6000 : type === "warning" ? 4500 : 3000;
  toastTimer = window.setTimeout(() => {
    state.toast = null;
    saveState();
    render();
  }, duration);
}

// Mengubah error dari Supabase Functions/Edge Function menjadi pesan Indonesia yang bisa
// dipahami user + saran perbaikan. Sebelumnya error yang tidak dikenal hanya tampil "{}"
// sehingga user tidak tahu kenapa WhatsApp tidak terkirim.
function describeFunctionError(error) {
  const err = error || {};
  const ctx = err.context;
  let detail = "";
  let hasRealDetail = false;
  if (ctx && typeof ctx === "object") {
    if (typeof ctx.error === "string" && ctx.error) { detail = ctx.error; hasRealDetail = true; }
    else if (typeof ctx.message === "string" && ctx.message) { detail = ctx.message; hasRealDetail = true; }
    else if (typeof ctx.msg === "string" && ctx.msg) { detail = ctx.msg; hasRealDetail = true; }
    else if (typeof ctx.detail === "string" && ctx.detail) { detail = ctx.detail; hasRealDetail = true; }
    else {
      const serialized = JSON.stringify(ctx);
      if (serialized && serialized !== "{}") { detail = serialized; hasRealDetail = true; }
    }
  } else if (typeof ctx === "string" && ctx.trim()) {
    detail = ctx;
    hasRealDetail = true;
  }
  if (!detail) detail = err.message || "WhatsApp admin belum terkirim (tidak ada detail dari server).";

  // Saran/tebakan penyebab HANYA berdasarkan status code, nama error, dan detail ASLI dari
  // server. Pesan fallback tidak ikut dipakai agar tidak menyesatkan (mis. kata "whatsapp"
  // pada pesan default tidak boleh memicu saran "cek secret Fonnte" untuk error 404).
  // Status code juga diekstrak dari pesan "non-2xx status code: XXX" milik supabase-js,
  // supaya toast bisa menampilkan 404/401/500 walaupun body respons kosong.
  let statusCode = err.status ? String(err.status) : "";
  if (!statusCode) {
    const statusMatch = String(err.message || "").match(/non-2xx status code: (\d{3})/i);
    if (statusMatch) statusCode = statusMatch[1];
  }
  const extra = [err.name, err.statusKind, statusCode].join(" ").trim();
  const hintText = `${extra} ${hasRealDetail ? detail : ""}`.toLowerCase();

  let hint = "";
  if (/\b401\b|jwt|authorization|login dibutuhkan|harus login|sesi login tidak|access token/i.test(hintText)) {
    hint = "Sesi login tidak valid/kedaluwarsa. Keluar lalu login ulang dengan Google, kemudian coba submit lagi.";
  } else if (/\b404\b|not found|belum deploy|function not/i.test(hintText)) {
    hint = "Edge Function send-booking-whatsapp mungkin belum di-deploy ke Supabase. Jalankan: supabase functions deploy send-booking-whatsapp";
  } else if (/fonnte|whatsapp|admin_wa|device/i.test(hintText)) {
    hint = "Cek di Supabase: Edge Functions > Secrets. Pastikan FONNTE_TOKEN dan ADMIN_WA_NUMBER sudah terisi, dan device Fonnte masih connect.";
  } else if (/fetch|network|load failed|internet|connection|terminated/i.test(hintText)) {
    hint = "Periksa koneksi internet/CORS. Buka website lewat http://localhost (server lokal) atau domain HTTPS, bukan dari file://.";
  } else if (/\b403\b|permission denied|policy|rls|row-level/i.test(hintText)) {
    hint = "Ada aturan keamanan (RLS policy) Supabase yang menolak. Cek tabel/function di Supabase Dashboard.";
  } else if (/\b500\b|internal|database|supabase error|server/i.test(hintText)) {
    hint = "Terjadi error di server Supabase. Buka halaman fungsi send-booking-whatsapp di Supabase Dashboard lalu lihat log-nya.";
  }
  return { detail: detail.trim(), hint };
}

function navigate(page) {
  state.activePage = page;
  state.mobileOpen = false;
  state.modal = null;
  saveState();
  render();
}

function openModal(name, data = {}) {
  state.modal = { name, data };
  saveState();
  render();
}

function closeModal() {
  state.modal = null;
  saveState();
  render();
}

async function signIn() {
  try {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: AUTH_REDIRECT_URL,
        queryParams: {
          prompt: "select_account"
        }
      }
    });
    if (error) throw error;
  } catch (error) {
    setToast("Login Google gagal", error.message || "Coba lagi setelah koneksi internet aktif.");
  }
}

async function signOut() {
  try {
    const client = requireSupabase();
    await client.auth.signOut();
  } finally {
    supabaseSession = null;
    state.session = null;
    state.activePage = "dashboard";
    state.mobileOpen = false;
    state.profileIncomplete = false;
    saveState();
    render();
  }
}

async function registerUser(event) {
  event.preventDefault();
  if (!supabaseSession) {
    await signIn();
    return;
  }

  const form = new FormData(event.currentTarget);
  const payload = {
    full_name: form.get("name").trim(),
    identity: form.get("identity"),
    nim_nidn: form.get("nim").trim(),
    phone: form.get("phone").trim(),
    email: supabaseSession.user.email || form.get("email").trim(),
    study_program: form.get("studyProgram").trim(),
    birth_date: form.get("birthDate")
  };

  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from("profiles")
      .update(payload)
      .eq("id", supabaseSession.user.id)
      .select("*")
      .single();

    if (error) throw error;

    await client.from("notifications").insert({
      recipient_role: "user",
      user_id: data.id,
      title: "Akun berhasil dibuat",
      message: "Akun Google sudah terhubung dan data diri tersimpan.",
      type: "approved"
    });

    state.users = [mapProfile(data)];
    state.session = { userId: data.id, role: data.role || "user" };
    state.profileIncomplete = false;
    state.activePage = "dashboard";
    await loadRemoteState();
    saveState();
    setToast("Akun tersimpan", "Profil Google sudah terhubung ke NusaLab.");
  } catch (error) {
    setToast("Profil gagal disimpan", error.message || "Periksa data lalu coba lagi.");
  }
}

function saveProfilePhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    setToast("Foto tidak valid", "Pilih file gambar untuk foto profil.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const size = 320;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const cropSize = Math.min(image.width, image.height);
      const sourceX = (image.width - cropSize) / 2;
      const sourceY = (image.height - cropSize) / 2;
      canvas.width = size;
      canvas.height = size;
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
      canvas.toBlob(async (blob) => {
        const user = getUser();
        if (!user || !blob) return;
        try {
          const client = requireSupabase();
          const path = `${user.id}/avatar.jpg`;
          const { error: uploadError } = await client.storage
            .from("avatars")
            .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = client.storage.from("avatars").getPublicUrl(path);
          const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
          const { error: updateError } = await client
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("id", user.id);
          if (updateError) throw updateError;

          user.avatar = avatarUrl;
          await refreshRemoteState();
          setToast("Foto profil diperbarui", "Avatar akun ini sudah diganti.");
        } catch (error) {
          setToast("Foto gagal diunggah", error.message || "Coba pilih gambar lain.");
        }
      }, "image/jpeg", 0.86);
    };
    image.onerror = () => setToast("Foto tidak valid", "Gambar tidak bisa dibaca oleh browser.");
    image.src = reader.result;
  };
  reader.onerror = () => setToast("Foto gagal dibaca", "Coba pilih file gambar lain.");
  reader.readAsDataURL(file);
}

async function removeProfilePhoto() {
  const user = getUser();
  if (!user) return;
  try {
    const client = requireSupabase();
    await client.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
    const { error } = await client.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    if (error) throw error;
    user.avatar = "";
    await refreshRemoteState();
    setToast("Foto profil dihapus", "Avatar kembali memakai inisial akun.");
  } catch (error) {
    setToast("Foto gagal dihapus", error.message || "Coba lagi beberapa saat lagi.");
  }
}

async function submitBooking(event) {
  event.preventDefault();
  const user = getUser();
  const isAdminUser = user?.role === "admin";
  const form = new FormData(event.currentTarget);
  const labId = form.get("labId");
  const date = form.get("date");
  const start = form.get("start");
  const end = form.get("end");
  if (start >= end) {
    setToast("Waktu tidak valid", "Jam selesai harus lebih besar dari jam mulai.");
    return;
  }
  const availability = checkAvailability(labId, date, start, end);
  if (!availability.available) {
    setToast("Jadwal belum tersedia", "Pilih lab atau rentang waktu lain.");
    return;
  }
  const booking = {
    user_id: user.id,
    requester: form.get("requester").trim(),
    requester_type: user.identity,
    lab_id: labId,
    booking_date: date,
    start_time: start,
    end_time: end,
    purpose: form.get("purpose").trim(),
    notes: form.get("notes").trim(),
    status: isAdminUser ? "approved" : "pending",
    ...(isAdminUser
      ? {
          reviewed_at: new Date().toISOString(),
          reviewed_by_name: user.name || "",
          admin_note: "Disetujui otomatis oleh admin.",
          reminder: true
        }
      : {})
  };

  try {
    const client = requireSupabase();
    const { data, error } = await client.from("bookings").insert(booking).select("*").single();
    if (error) throw error;

    if (isAdminUser) {
      // Admin: peminjaman langsung disetujui & masuk kalender. Tidak perlu kirim
      // WhatsApp "permintaan baru" ke admin (pemohon == admin itu sendiri).
      setToast(
        "Peminjaman dibuat",
        "Sebagai admin, peminjaman langsung disetujui dan masuk ke kalender."
      );
      state.activePage = "calendar";
      await loadRemoteState();
      saveState();
      render();
      return;
    }

    try {
      // Ambil access token dari session TERBARU (bukan hanya supabaseSession) supaya
      // header Authorization selalu valid. Edge Function memakai verify_jwt=true,
      // jadi tanpa token valid ia menolak dengan error 401.
      let accessToken = supabaseSession?.access_token;
      try {
        const sessionResult = await client.auth.getSession();
        if (sessionResult.data?.session?.access_token) {
          accessToken = sessionResult.data.session.access_token;
        }
      } catch (sessionErr) {
        console.warn("[NusaLab] Gagal mengambil session terbaru, pakai session lama:", sessionErr);
      }

      if (!accessToken) {
        setToast(
          "Pengajuan tersimpan",
          "Notifikasi WhatsApp tidak terkirim karena sesi login tidak ditemukan. Muat ulang halaman, login ulang, lalu coba submit lagi.",
          "warning"
        );
      } else {
        // Pakai fetch langsung ke Edge Function (bukan client.functions.invoke) supaya
        // status code DAN body error asli tetap bisa dibaca. supabase-js sering
        // menutupinya dengan pesan generik "Edge Function returned a non-2xx status code".
        const functionUrl = `${SUPABASE_URL}/functions/v1/send-booking-whatsapp`;
        const functionResponse = await fetch(functionUrl, {
          method: "POST",
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ booking_id: data.id })
        });
        const responseText = await functionResponse.text();
        let responseBody = null;
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          responseBody = responseText || null;
        }
        if (!functionResponse.ok) {
          const functionError = new Error(`Edge Function ${functionResponse.status}`);
          functionError.name = "FunctionsHttpError";
          functionError.status = functionResponse.status;
          functionError.context = responseBody;
          throw functionError;
        }
        setToast("Pengajuan terkirim", "Admin menerima notifikasi dashboard dan WhatsApp.");
      }
    } catch (functionError) {
      console.error("[NusaLab] send-booking-whatsapp gagal:", functionError);
      const info = describeFunctionError(functionError);
      setToast(
        "Pengajuan tersimpan, WA tidak terkirim",
        `${info.detail}${info.hint ? " Saran: " + info.hint : ""}`,
        "warning"
      );
    }

    state.activePage = "schedule";
    await loadRemoteState();
    saveState();
    render();
  } catch (error) {
    setToast("Pengajuan gagal", error.message || "Periksa jadwal dan coba lagi.");
  }
}

async function updateBookingStatus(id, status, note) {
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return;
  try {
    const client = requireSupabase();
    const reviewer = getUser();
    const { error } = await client
      .from("bookings")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: state.session.userId,
        reviewed_by_name: reviewer?.name || "",
        admin_note: note || (status === "approved" ? "Disetujui oleh admin." : "Ditolak oleh admin."),
        reminder: status === "approved"
      })
      .eq("id", id);
    if (error) throw error;

    // Kirim notifikasi keputusan ke user via WhatsApp (best-effort: keputusan tetap
    // tersimpan walau pengiriman WA gagal). Belum ada di jalur web sebelum ini.
    let waResult = "";
    try {
      let accessToken = supabaseSession?.access_token;
      try {
        const sessionResult = await client.auth.getSession();
        if (sessionResult.data?.session?.access_token) {
          accessToken = sessionResult.data.session.access_token;
        }
      } catch (sessionErr) {
        console.warn("[NusaLab] Gagal ambil session terbaru untuk kirim WA keputusan:", sessionErr);
      }

      if (!accessToken) {
        waResult = "Keputusan tersimpan, WA user tidak terkirim (sesi login terputus).";
      } else {
        const fnUrl = `${SUPABASE_URL}/functions/v1/notify-booking-decision`;
        const fnRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ booking_id: id, status })
        });
        const fnText = await fnRes.text();
        let fnBody = null;
        try {
          fnBody = JSON.parse(fnText);
        } catch {
          fnBody = fnText || null;
        }
        if (!fnRes.ok) {
          console.warn("[NusaLab] notify-booking-decision gagal:", fnBody);
        }
        waResult = typeof fnBody?.message === "string"
          ? fnBody.message
          : (fnRes.ok ? "Keputusan & notifikasi WhatsApp user terkirim." : `Keputusan tersimpan, WA user gagal (${fnRes.status}).`);
      }
    } catch (waError) {
      console.warn("[NusaLab] notify-booking-decision error:", waError);
      waResult = waError instanceof Error ? `Keputusan tersimpan, WA user gagal: ${waError.message}` : "Keputusan tersimpan, WA user gagal dikirim.";
    }

    closeModal();
    await loadRemoteState();
    render();
    setToast(status === "approved" ? "Peminjaman disetujui" : "Peminjaman ditolak", waResult || "Keputusan & notifikasi dibuat.");
  } catch (error) {
    setToast("Keputusan gagal", error.message || "Coba lagi beberapa saat lagi.");
  }
}

async function cancelBooking(event, id) {
  event.preventDefault();
  const user = getUser();
  const form = new FormData(event.currentTarget);
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return;
  try {
    const client = requireSupabase();
    const { error } = await client
      .from("bookings")
      .update({
        status: "cancelled",
        cancel_reason: form.get("reason"),
        cancel_note: form.get("note").trim(),
        cancelled_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;

    // Kirim notifikasi pembatalan ke admin via WhatsApp (best-effort: pembatalan tetap
    // tersimpan walau pengiriman WA gagal). Notifikasi dashboard admin sudah dibuat
    // otomatis oleh trigger SQL after_booking_status_update.
    let waResult = "";
    try {
      let accessToken = supabaseSession?.access_token;
      try {
        const sessionResult = await client.auth.getSession();
        if (sessionResult.data?.session?.access_token) {
          accessToken = sessionResult.data.session.access_token;
        }
      } catch (sessionErr) {
        console.warn("[NusaLab] Gagal ambil session untuk kirim WA pembatalan:", sessionErr);
      }

      // Admin yang membatalkan peminjamannya sendiri tidak perlu dikirim WA
      // ke nomor admin (notifikasi diri sendiri). User tetap dikirim seperti biasa.
      if (accessToken && user.role !== "admin") {
        const fnUrl = `${SUPABASE_URL}/functions/v1/notify-admin-cancellation`;
        const fnRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ booking_id: id })
        });
        const fnText = await fnRes.text();
        let fnBody = null;
        try {
          fnBody = JSON.parse(fnText);
        } catch {
          fnBody = fnText || null;
        }
        if (!fnRes.ok) {
          console.warn("[NusaLab] notify-admin-cancellation gagal:", fnBody);
        }
        waResult = typeof fnBody?.message === "string"
          ? fnBody.message
          : (fnRes.ok ? "Notifikasi pembatalan terkirim ke admin." : `WhatsApp admin gagal (${fnRes.status}).`);
      }
    } catch (waError) {
      console.warn("[NusaLab] notify-admin-cancellation error:", waError);
    }

    closeModal();
    await loadRemoteState();
    render();
    setToast("Jadwal dibatalkan", waResult || "Slot waktu kembali tersedia di kalender.");
  } catch (error) {
    setToast("Pembatalan gagal", error.message || "Coba lagi beberapa saat lagi.");
  }
}

async function saveMaintenance(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const item = {
    lab_id: form.get("labId"),
    maintenance_date: form.get("date"),
    start_time: form.get("start"),
    end_time: form.get("end"),
    reason: form.get("reason").trim(),
    status: "scheduled",
    created_by: state.session.userId
  };
  if (item.start_time >= item.end_time) {
    setToast("Waktu tidak valid", "Jam selesai harus lebih besar dari jam mulai.");
    return;
  }

  try {
    const client = requireSupabase();
    const { error } = await client.from("maintenance").insert(item);
    if (error) throw error;

    await client.from("notifications").insert({
      recipient_role: "admin",
      title: "Maintenance dijadwalkan",
      message: `${getLab(item.lab_id).name} masuk mode maintenance pada ${formatDate(item.maintenance_date)}.`,
      type: "maintenance"
    });

    await loadRemoteState();
    render();
    setToast("Maintenance tersimpan", "Kalender lab sudah diperbarui.");
  } catch (error) {
    setToast("Maintenance gagal", error.message || "Periksa jadwal dan coba lagi.");
  }
}

async function removeMaintenance(id) {
  try {
    const client = requireSupabase();
    const { error } = await client.from("maintenance").delete().eq("id", id);
    if (error) throw error;
    await loadRemoteState();
    render();
    setToast("Maintenance dihapus", "Slot lab kembali tersedia.");
  } catch (error) {
    setToast("Maintenance gagal dihapus", error.message || "Coba lagi beberapa saat lagi.");
  }
}

async function markNotificationsRead() {
  const user = getUser();
  const ids = state.notifications
    .filter((notification) => {
      if (state.session.role === "admin") return notification.role === "admin";
      return notification.role === "user" && notification.userId === user.id;
    })
    .map((notification) => notification.id);
  if (!ids.length) return;

  try {
    const client = requireSupabase();
    const { error } = await client.from("notifications").update({ unread: false }).in("id", ids);
    if (error) throw error;
    state.notifications = state.notifications.map((notification) => {
    const isMine = state.session.role === "admin"
      ? notification.role === "admin"
      : notification.role === "user" && notification.userId === user.id;
    return isMine ? { ...notification, unread: false } : notification;
  });
    render();
  } catch (error) {
    setToast("Notifikasi gagal diupdate", error.message || "Coba lagi beberapa saat lagi.");
  }
}

function syncRemoteData() {
  localStorage.removeItem(STORAGE_KEY);
  refreshRemoteState();
}

function render() {
  const root = document.querySelector("#app");
  try {
    if (state.authLoading) {
      root.innerHTML = renderLoading("Menyiapkan sesi NusaLab...");
      return;
    }
    if (!state.session || state.profileIncomplete) {
      root.innerHTML = renderAuth();
      bindAuth();
      return;
    }
    if (state.dataLoading && !getUser()) {
      root.innerHTML = renderLoading("Memuat data dashboard...");
      return;
    }
    root.innerHTML = renderShell();
    bindApp();
  } catch (error) {
    // Jaring pengaman terakhir: error render tidak boleh menimbulkan layar putih.
    console.error("[NusaLab] Render error:", error);
    root.innerHTML = `
      <main class="auth-shell">
        <section class="auth-panel">
          <div class="auth-card">
            <h2>Terjadi kesalahan</h2>
            <div class="notice warning">
              ${icon("x")}
              <div>
                <strong>Halaman tidak bisa ditampilkan</strong>
                <div>${escapeHtml(error.message || "Unknown error")}</div>
              </div>
            </div>
          </div>
        </section>
      </main>`;
  }
}

function renderLoading(message) {
  return `
    <main class="auth-shell">
      <section class="auth-side" aria-label="Ringkasan sistem">
        <div class="auth-side-inner">
          <div class="brand-lockup">
            <span class="brand-mark">${icons.lab}</span>
            <span>NusaLab</span>
          </div>
          <div class="auth-copy">
            <p class="eyebrow">Sistem peminjaman laboratorium</p>
            <h1>${message}</h1>
            <p>Mohon tunggu sebentar.</p>
          </div>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <div class="notice success">
            ${icon("shield")}
            <div>
              <strong>Terhubung ke Supabase</strong>
              <div>${message}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderAuth() {
  const mode = state.profileIncomplete ? "register" : state.authMode;
  const isProfileStep = Boolean(supabaseSession && state.profileIncomplete);
  return `
    <main class="auth-shell">
      <section class="auth-side" aria-label="Ringkasan sistem">
        <div class="auth-side-inner">
          <div class="brand-lockup">
            <span class="brand-mark">${icons.lab}</span>
            <span>NusaLab</span>
          </div>
          <div class="auth-copy">
            <p class="eyebrow">Sistem peminjaman laboratorium</p>
            <h1>Kelola jadwal lab dari pengajuan sampai surat peminjaman.</h1>
            <p>Alur pengguna, admin, notifikasi, maintenance, pembatalan, dan bukti peminjaman dirapikan dalam satu dashboard.</p>
          </div>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <h2>${mode === "login" ? "Masuk ke dashboard" : isProfileStep ? "Lengkapi data akun" : "Daftar akun peminjam"}</h2>
          <p>${mode === "login" ? "Gunakan akun Google kampus untuk masuk ke NusaLab." : "Data ini melengkapi akun Google agar bisa mengajukan peminjaman lab."}</p>
          ${state.authError ? `<div class="notice warning">${icon("x")}<div><strong>Auth belum siap</strong><div>${escapeHtml(state.authError)}</div></div></div>` : ""}
          ${state.remoteError ? `<div class="notice warning">${icon("x")}<div><strong>Supabase error</strong><div>${escapeHtml(state.remoteError)}</div></div></div>` : ""}
          ${mode === "login" ? renderLogin() : renderRegister()}
        </div>
      </section>
      ${state.toast ? renderToast() : ""}
    </main>
  `;
}

function renderLogin() {
  return `
    <form class="auth-form" id="loginForm">
      <div class="notice success">
        ${icon("shield")}
        <div>
          <strong>Login dengan Google</strong>
          <div>Google akan menampilkan Account Chooser jika ada beberapa akun tersimpan.</div>
        </div>
      </div>
      <div class="auth-actions">
        <button class="btn btn-primary google-btn" type="submit"><span class="google-mark">G</span>Masuk dengan Google</button>
        <button class="link-button" type="button" data-auth-mode="register">Register akun</button>
      </div>
    </form>
  `;
}

function renderRegister() {
  const user = getUser();
  const defaults = authUserDefaults(supabaseSession?.user);
  const name = user?.name || defaults.full_name;
  const identity = user?.identity || defaults.identity;
  const nim = user?.nim || defaults.nim_nidn;
  const studyProgram = user?.studyProgram || defaults.study_program;
  const phone = user?.phone || defaults.phone;
  const birthDate = user?.birthDate || defaults.birth_date;
  const email = user?.email || defaults.email;
  return `
    <form class="auth-form" id="registerForm">
      ${!supabaseSession ? `
        <div class="notice warning">
          ${icon("shield")}
          <div>
            <strong>Masuk Google dulu</strong>
            <div>Akun Google dipakai sebagai identitas utama sebelum data diri dilengkapi.</div>
          </div>
        </div>
      ` : ""}
      <div class="form-grid two">
        <label class="field">
          <span>Nama lengkap</span>
          <input name="name" required placeholder="Nama peminjam" value="${escapeHtml(name)}" />
        </label>
        <label class="field">
          <span>Role</span>
          <select name="identity" required>
            <option ${identity === "Mahasiswa" ? "selected" : ""}>Mahasiswa</option>
            <option ${identity === "Dosen" ? "selected" : ""}>Dosen</option>
          </select>
        </label>
      </div>
      <label class="field">
        <span>NIM / NIDN</span>
        <input name="nim" required placeholder="Nomor identitas kampus" value="${escapeHtml(nim)}" />
      </label>
      <label class="field">
        <span>Jurusan / Prodi</span>
        <input name="studyProgram" required placeholder="Contoh: Teknik Informatika" value="${escapeHtml(studyProgram)}" />
      </label>
      <div class="form-grid two">
        <label class="field">
          <span>Nomor telepon</span>
          <input name="phone" required placeholder="WhatsApp aktif" value="${escapeHtml(phone)}" />
        </label>
        <label class="field">
          <span>Tanggal lahir</span>
          <input name="birthDate" type="date" required value="${escapeHtml(birthDate)}" />
        </label>
      </div>
      <label class="field">
        <span>Email kampus</span>
        <input name="email" type="email" required readonly placeholder="nama@kampus.ac.id" value="${escapeHtml(email)}" />
      </label>
      <div class="auth-actions">
        <button class="btn btn-primary" type="submit">${icon("check")}${supabaseSession ? "Simpan profil" : "Masuk dengan Google"}</button>
        ${supabaseSession ? `<button class="link-button" type="button" data-logout>Keluar</button>` : `<button class="link-button" type="button" data-auth-mode="login">Kembali login</button>`}
      </div>
    </form>
  `;
}

function renderShell() {
  const user = getUser();
  const isAdmin = state.session.role === "admin";
  const title = currentPageTitle();
  return `
    <div class="app-shell">
      <div class="overlay ${state.mobileOpen ? "is-open" : ""}" data-close-sidebar></div>
      ${renderSidebar(user, isAdmin)}
      <main>
        <div class="mobile-topbar">
          <button class="btn btn-ghost btn-icon" data-toggle-sidebar aria-label="Buka menu">${icon("menu")}</button>
          <div class="brand-lockup">
            <span class="brand-mark">${icons.lab}</span>
            <span>NusaLab</span>
          </div>
          <button class="btn btn-ghost btn-icon" data-page="notifications" aria-label="Notifikasi">${icon("bell")}</button>
        </div>
        <section class="content">
          <div class="content-inner">
            ${renderStatusBanner()}
            ${renderPage(title, isAdmin)}
          </div>
        </section>
      </main>
    </div>
    ${state.modal ? renderModal() : ""}
    ${state.toast ? renderToast() : ""}
  `;
}

function renderStatusBanner() {
  if (state.remoteError) {
    return `
      <div class="notice warning app-notice">
        ${icon("x")}
        <div>
          <strong>Data Supabase belum sinkron</strong>
          <div>${escapeHtml(state.remoteError)}</div>
        </div>
      </div>
    `;
  }
  if (state.dataLoading) {
    return `
      <div class="notice success app-notice">
        ${icon("shield")}
        <div>
          <strong>Memuat data terbaru</strong>
          <div>Dashboard sedang mengambil data dari Supabase.</div>
        </div>
      </div>
    `;
  }
  return "";
}

function renderSidebar(user, isAdmin) {
  const nav = isAdmin
      ? [
        ["dashboard", "Dashboard Admin", "dashboard"],
        ["profile", "Profil", "user"],
        ["requests", "Permintaan", "inbox"],
        ["schedule", "Jadwal Saya", "calendar"],
        ["calendar", "Kalender", "calendar"],
        ["borrow", "Ajukan Peminjaman", "plus"],
        ["maintenance", "Maintenance", "wrench"],
        ["notifications", "Notifikasi", "bell"],
        ["analytics", "Analitik", "chart"]
      ]
    : [
        ["dashboard", "Dashboard", "dashboard"],
        ["profile", "Profil", "user"],
        ["schedule", "Jadwal Saya", "calendar"],
        ["calendar", "Kalender", "calendar"],
        ["history", "Riwayat", "history"],
        ["borrow", "Ajukan Peminjaman", "plus"],
        ["notifications", "Notifikasi", "bell"]
      ];

  return `
    <aside class="sidebar ${state.mobileOpen ? "is-open" : ""}" aria-label="Menu utama">
      <div class="sidebar-head">
        <span class="brand-mark">${icons.lab}</span>
        <div class="brand-text">
          <strong>NusaLab</strong>
          <span>${isAdmin ? "Panel Admin" : "Portal Peminjam"}</span>
        </div>
        <button class="btn btn-ghost btn-icon mobile-close" data-close-sidebar aria-label="Tutup menu">${icon("close")}</button>
      </div>
      <nav class="sidebar-nav">
        ${nav
          .map(
            ([page, label, iconName]) => `
              <button class="nav-item ${state.activePage === page ? "is-active" : ""}" data-page="${page}">
                ${icon(iconName)}
                <span>${label}</span>
              </button>
            `
          )
          .join("")}
      </nav>
      <div class="sidebar-foot">
        <div class="user-mini">
          ${renderAvatar(user)}
          <div>
            <strong>${user.name}</strong>
            <span>${user.identity}</span>
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" data-sync>${icon("history")}Sinkron</button>
          <button class="btn btn-danger" data-logout>${icon("logout")}Keluar</button>
        </div>
      </div>
    </aside>
  `;
}

function renderAvatar(user, extraClass = "") {
  const classes = ["avatar", user.role === "admin" ? "admin" : "", extraClass].filter(Boolean).join(" ");
  if (user.avatar) {
    return `<span class="${classes}"><img src="${user.avatar}" alt="Foto ${user.name}" /></span>`;
  }
  return `<span class="${classes}">${initials(user.name)}</span>`;
}

function currentPageTitle() {
  const map = {
    dashboard: state.session?.role === "admin" ? "Dashboard Admin" : "Dashboard",
    profile: "Profil",
    schedule: "Jadwal Saya",
    calendar: "Kalender",
    history: "Riwayat Peminjaman",
    borrow: "Ajukan Peminjaman",
    notifications: "Notifikasi",
    requests: "Permintaan Peminjaman",
    maintenance: "Maintenance Lab",
    analytics: "Analitik"
  };
  return map[state.activePage] || "Dashboard";
}

function renderPage(title, isAdmin) {
  const actions = pageActions();
  return `
    <header class="page-head">
      <div class="page-title">
        <h1>${title}</h1>
        <p>${pageSubtitle()}</p>
      </div>
      ${actions ? `<div class="toolbar">${actions}</div>` : ""}
    </header>
    ${isAdmin ? renderAdminPage() : renderUserPage()}
  `;
}

function pageSubtitle() {
  const map = {
    dashboard: state.session?.role === "admin"
      ? "Pantau permintaan, keputusan, dan ketersediaan lab hari ini."
      : "Ringkasan jadwal aktif, status pengajuan, dan notifikasi terbaru.",
    profile: "",
    schedule: "Jadwal aktif yang masih menunggu atau sudah disetujui.",
    calendar: "Rincian kalender laboratorium dari awal hingga akhir tahun.",
    history: "",
    borrow: "Pilih lab, waktu, penanggung jawab, dan tujuan kegiatan.",
    notifications: "",
    requests: "Verifikasi pengajuan user dan kirim keputusan.",
    maintenance: "Atur jadwal perawatan lab agar tidak bentrok dengan peminjaman.",
    analytics: "Statistik pemakaian lab untuk evaluasi operasional."
  };
  return map[state.activePage] || "";
}

function pageActions() {
  if (state.activePage === "borrow") return "";
  if (state.activePage === "notifications") {
    return `<button class="btn btn-soft" data-read-notifications>${icon("check")}Tandai dibaca</button>`;
  }
  if (state.activePage === "dashboard" && state.session.role === "user") {
    return `<button class="btn btn-primary" data-page="borrow">${icon("plus")}Peminjaman Baru</button>`;
  }
  if (state.activePage === "dashboard" && state.session.role === "admin") {
    return `<button class="btn btn-primary" data-page="borrow">${icon("plus")}Peminjaman Baru</button>`;
  }
  if (state.activePage === "calendar" && state.session.role === "user") {
    return `<button class="btn btn-primary" data-page="borrow">${icon("plus")}Ajukan Peminjaman</button>`;
  }
  if (state.activePage === "calendar" && state.session.role === "admin") {
    return `<button class="btn btn-soft" data-page="maintenance">${icon("wrench")}Jadwalkan Maintenance</button>`;
  }
  if (state.activePage === "requests") {
    return `<button class="btn btn-soft" data-page="maintenance">${icon("wrench")}Jadwalkan Maintenance</button>`;
  }
  return "";
}

function renderUserPage() {
  const pages = {
    dashboard: renderUserDashboard,
    profile: renderProfile,
    schedule: renderSchedule,
    calendar: renderYearCalendar,
    history: renderHistory,
    borrow: renderBorrowForm,
    notifications: renderNotifications
  };
  return (pages[state.activePage] || renderUserDashboard)();
}

function renderAdminPage() {
  const pages = {
    dashboard: renderAdminDashboard,
    profile: renderProfile,
    requests: renderRequests,
    schedule: renderSchedule,
    calendar: renderYearCalendar,
    borrow: renderBorrowForm,
    maintenance: renderMaintenance,
    notifications: renderNotifications,
    analytics: renderAnalytics
  };
  return (pages[state.activePage] || renderAdminDashboard)();
}

function renderUserDashboard() {
  const metrics = appMetrics("user");
  const user = getUser();
  const active = state.bookings
    .filter((booking) => booking.userId === user.id && isActiveStatus(booking.status) && isUpcomingDate(booking.date))
    .sort(byDateTime);
  return `
    ${renderMetrics([
      ["Jadwal aktif saya", metrics.active, "calendar"],
      ["Menunggu", metrics.pending, "inbox"]
    ])}
    <div class="layout-grid">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Jadwal terdekat</h2>
            <p>Pengajuan pending dan jadwal yang sudah disetujui.</p>
          </div>
          <button class="btn btn-ghost" data-page="schedule">${icon("calendar")}Lihat semua</button>
        </div>
        <div class="section-body">
          ${active.length ? `<div class="list">${active.slice(0, 5).map(renderBookingItem).join("")}</div>` : renderEmpty("calendar", "Belum ada jadwal aktif.")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Kalender lab</h2>
            <p>Ringkasan 7 hari ke depan.</p>
          </div>
        </div>
        <div class="section-body">
          ${renderCalendarStrip()}
        </div>
      </section>
    </div>
  `;
}

function renderAdminDashboard() {
  const metrics = appMetrics("admin");
  const pending = state.bookings.filter((booking) => booking.status === "pending").sort(byDateTime);
  const upcomingMaintenance = state.maintenance.slice().sort(byDateTime);
  return `
    ${renderMetrics([
      ["Permintaan pending", metrics.pending, "inbox"],
      ["Maintenance", metrics.maintenance, "wrench"]
    ])}
    <div class="layout-grid">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Antrian verifikasi</h2>
            <p>Permintaan terbaru dari dashboard dan WhatsApp.</p>
          </div>
          <button class="btn btn-primary" data-page="requests">${icon("search")}Review</button>
        </div>
        <div class="section-body">
          ${pending.length ? `<div class="list">${pending.slice(0, 5).map(renderBookingItem).join("")}</div>` : renderEmpty("check", "Tidak ada permintaan pending.")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Maintenance terjadwal</h2>
            <p>Lab yang tidak tersedia sementara.</p>
          </div>
        </div>
        <div class="section-body">
          ${upcomingMaintenance.length ? `<div class="list">${upcomingMaintenance.slice(0, 4).map(renderMaintenanceItem).join("")}</div>` : renderEmpty("wrench", "Belum ada maintenance terjadwal.")}
        </div>
      </section>
    </div>
  `;
}

function renderMetrics(items) {
  return `
    <div class="metrics">
      ${items
        .map(
          ([label, value, iconName]) => `
          <div class="metric-card">
            <div class="metric-top">
              <div>
                <span>${label}</span>
                <strong>${value}</strong>
              </div>
              <div class="icon-box">${icon(iconName)}</div>
            </div>
          </div>`
        )
        .join("")}
    </div>
  `;
}

function renderProfile() {
  const user = getUser();
  const metrics = appMetrics(state.session.role);
  return `
    <div class="profile-grid">
      <section class="section profile-card">
        <div class="profile-identity">
          ${renderAvatar(user, "profile-avatar")}
          <div>
            <h2>${user.name}</h2>
            <p>${user.identity}</p>
          </div>
        </div>
        <div class="avatar-actions">
          <input class="sr-only" id="avatarInput" type="file" accept="image/png, image/jpeg, image/webp" />
          <label class="btn btn-ghost" for="avatarInput">${icon("user")}Ganti foto</label>
          ${user.avatar ? `<button class="btn btn-danger" type="button" data-remove-avatar>${icon("x")}Hapus foto</button>` : ""}
        </div>
        <div class="profile-badges">
          <span class="pill approved">${icon("shield")}Terverifikasi</span>
          <span class="pill info">${user.studyProgram}</span>
        </div>
        <div class="profile-stat-grid">
          <div class="profile-stat">
            <span>Jadwal aktif</span>
            <strong>${metrics.active}</strong>
          </div>
          <div class="profile-stat">
            <span>Menunggu</span>
            <strong>${metrics.pending}</strong>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Informasi akun</h2>
          </div>
        </div>
        <div class="section-body">
          <div class="detail-list account-list">
            ${detailRow("Nama lengkap", user.name)}
            ${detailRow("NIM / NIDN", user.nim)}
            ${detailRow("Role", user.identity)}
            ${detailRow("Jurusan / Prodi", user.studyProgram)}
            ${detailRow("Email", user.email)}
            ${detailRow("Nomor WhatsApp", user.phone)}
            ${detailRow("Tanggal lahir", formatDate(user.birthDate))}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderSchedule() {
  const user = getUser();
  const active = state.bookings
    .filter((booking) => booking.userId === user.id && isActiveStatus(booking.status) && isUpcomingDate(booking.date))
    .sort(byDateTime);
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>Daftar jadwal aktif</h2>
          <p>Pembatalan dapat dilakukan sebelum jadwal dimulai.</p>
        </div>
        <button class="btn btn-primary" data-page="borrow">${icon("plus")}Ajukan</button>
      </div>
      <div class="section-body">
        ${active.length ? `<div class="list">${active.map(renderBookingItem).join("")}</div>` : renderEmpty("calendar", "Belum ada jadwal aktif.")}
      </div>
    </section>
  `;
}

function renderHistory() {
  const user = getUser();
  const rows = state.bookings
    .filter((booking) => booking.userId === user.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>Riwayat lengkap</h2>
        </div>
      </div>
      <div class="section-body">
        ${renderBookingTable(rows)}
      </div>
    </section>
  `;
}

function renderBorrowForm() {
  const user = getUser();
  const isAdminUser = user?.role === "admin";
  return `
    <div class="layout-grid">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Form peminjaman</h2>
            <p>${isAdminUser
              ? "Sebagai admin, peminjaman langsung disetujui dan otomatis masuk kalender."
              : "Cek jadwal tersedia sebelum permintaan dikirim ke admin."}</p>
          </div>
        </div>
        <div class="section-body">
          ${isAdminUser ? `
          <div class="notice info app-notice">
            ${icon("shield")}
            <div>
              <strong>Mode admin</strong>
              <div>Peminjaman yang kamu buat langsung berstatus disetujui tanpa perlu verifikasi.</div>
            </div>
          </div>` : ""}
          <form class="form-grid" id="borrowForm">
            <div class="form-grid two">
              <label class="field">
                <span>Tanggal</span>
                <input name="date" type="date" min="${todayISO()}" value="${todayISO()}" required />
              </label>
              <label class="field">
                <span>Lab</span>
                <select name="labId" required>
                  ${state.labs.map((lab) => `<option value="${lab.id}">${lab.name}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="form-grid two">
              <label class="field">
                <span>Mulai</span>
                <input name="start" type="time" value="09:00" required />
              </label>
              <label class="field">
                <span>Selesai</span>
                <input name="end" type="time" value="11:00" required />
              </label>
            </div>
            <label class="field">
              <span>Oleh siapa</span>
              <input name="requester" value="${user.name}" required />
            </label>
            <label class="field">
              <span>Tujuan kegiatan</span>
              <input name="purpose" placeholder="Contoh: praktikum, workshop, penelitian" required />
            </label>
            <label class="field">
              <span>Catatan tambahan</span>
              <textarea name="notes" placeholder="Opsional"></textarea>
            </label>
            <div class="toolbar">
              <button class="btn btn-soft" type="button" data-check-availability>${icon("search")}Cek ketersediaan</button>
              <button class="btn btn-primary" type="submit">${icon("send")}${isAdminUser ? "Simpan peminjaman" : "Submit peminjaman"}</button>
            </div>
          </form>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Status ketersediaan</h2>
          </div>
        </div>
        <div class="section-body">
          <div id="availabilityResult">${renderAvailabilityPreview("lab-software", todayISO(), "09:00", "11:00")}</div>
        </div>
      </section>
    </div>
  `;
}

function renderAvailabilityPreview(labId, date, start, end) {
  const lab = getLab(labId);
  const result = checkAvailability(labId, date, start, end);
  return `
    <div class="availability-panel">
      <div class="availability-row">
        <strong>${lab.name}</strong>
        <span class="pill ${result.available ? "approved" : "rejected"}">${result.available ? "Tersedia" : "Bentrok"}</span>
      </div>
      <div class="detail-list">
        ${detailRow("Tanggal", formatDate(date))}
        ${detailRow("Waktu", `${start}-${end}`)}
        ${detailRow("Kapasitas", `${lab.capacity} orang`)}
        ${detailRow("Lokasi", lab.location)}
      </div>
      <div class="notice ${result.available ? "success" : "warning"}">
        ${icon(result.available ? "check" : "x")}
        <div>
          <strong>${result.available ? "Slot dapat diajukan" : "Slot tidak tersedia"}</strong>
          <div>${availabilityMessage(result)}</div>
        </div>
      </div>
    </div>
  `;
}

function availabilityMessage(result) {
  if (result.available) return "Permintaan akan dikirim ke admin untuk verifikasi.";
  if (result.maintenanceConflict) return "Lab sedang masuk jadwal maintenance pada rentang waktu tersebut.";
  return "Ada peminjaman aktif pada rentang waktu tersebut.";
}

function renderNotifications() {
  const user = getUser();
  const rows = state.notifications.filter((notification) => {
    if (state.session.role === "admin") return notification.role === "admin";
    return notification.role === "user" && notification.userId === user.id;
  });
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>Daftar notifikasi</h2>
        </div>
      </div>
      <div class="section-body">
        ${rows.length ? `<div class="list">${rows.map(renderNotificationItem).join("")}</div>` : renderEmpty("bell", "Belum ada notifikasi.")}
      </div>
    </section>
  `;
}

function renderRequests() {
  const pending = state.bookings.filter((booking) => booking.status === "pending").sort(byDateTime);
  const all = state.bookings.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return `
    <div class="layout-grid">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Butuh keputusan</h2>
            <p>Setujui atau tolak setelah cek detail dan ketersediaan.</p>
          </div>
        </div>
        <div class="section-body">
          ${pending.length ? `<div class="list">${pending.map(renderBookingItem).join("")}</div>` : renderEmpty("check", "Tidak ada permintaan pending.")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Aktivitas terbaru</h2>
            <p>Semua keputusan yang tercatat di sistem.</p>
          </div>
        </div>
        <div class="section-body">
          ${renderBookingTable(all.slice(0, 8), true)}
        </div>
      </section>
    </div>
  `;
}

function renderMaintenance() {
  return `
    <div class="layout-grid">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Form maintenance</h2>
            <p>Slot maintenance akan menutup ketersediaan lab.</p>
          </div>
        </div>
        <div class="section-body">
          <form class="form-grid" id="maintenanceForm">
            <label class="field">
              <span>Lab</span>
              <select name="labId" required>${state.labs.map((lab) => `<option value="${lab.id}">${lab.name}</option>`).join("")}</select>
            </label>
            <div class="form-grid two">
              <label class="field">
                <span>Tanggal</span>
                <input name="date" type="date" min="${todayISO()}" value="${todayISO()}" required />
              </label>
              <label class="field">
                <span>Mulai</span>
                <input name="start" type="time" value="08:00" required />
              </label>
            </div>
            <label class="field">
              <span>Selesai</span>
              <input name="end" type="time" value="10:00" required />
            </label>
            <label class="field">
              <span>Catatan maintenance</span>
              <textarea name="reason" required>Perawatan perangkat dan pengecekan koneksi.</textarea>
            </label>
            <button class="btn btn-primary" type="submit">${icon("check")}Simpan maintenance</button>
          </form>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Daftar maintenance</h2>
            <p>Jadwal lab yang sedang dikunci.</p>
          </div>
        </div>
        <div class="section-body">
          ${state.maintenance.length ? `<div class="list">${state.maintenance.map(renderMaintenanceItem).join("")}</div>` : renderEmpty("wrench", "Belum ada maintenance.")}
        </div>
      </section>
    </div>
  `;
}

function renderAnalytics() {
  const labStats = state.labs.map((lab) => {
    const total = state.bookings.filter((booking) => booking.labId === lab.id && booking.status !== "cancelled").length;
    const approved = state.bookings.filter((booking) => booking.labId === lab.id && booking.status === "approved").length;
    return { lab, total, approved };
  });
  const range = state.analyticsRange || "month";
  const labId = state.analyticsLabId || "all";
  const series = buildAnalyticsSeries(range, labId);
  return `
    <div class="layout-grid equal">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Penggunaan per lab</h2>
            <p>Jumlah peminjaman yang tercatat.</p>
          </div>
        </div>
        <div class="section-body">
          <div class="list">
            ${labStats
              .map(
                ({ lab, total, approved }) => `
                <div class="item">
                  <div class="item-main">
                    <div class="item-title">${lab.name}</div>
                    <div class="item-meta"><span>${approved} disetujui</span><span>${total} total pengajuan</span></div>
                  </div>
                  <span class="pill info">${lab.code}</span>
                </div>`
              )
              .join("")}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-head analytics-head">
          <div>
            <h2>Tren peminjaman</h2>
            <p>Grafik garis berdasarkan rentang waktu dan lab yang dipilih.</p>
          </div>
          <div class="analytics-controls">
            <div class="segmented segmented-tight" role="tablist" aria-label="Rentang analitik">
              ${[
                ["week", "1 Minggu"],
                ["month", "1 Bulan"],
                ["year", "1 Tahun"]
              ].map(([value, label]) => `<button type="button" class="${range === value ? "is-active" : ""}" data-analytics-range="${value}">${label}</button>`).join("")}
            </div>
            <label class="field analytics-filter">
              <span>Lab</span>
              <select data-analytics-lab>
                <option value="all" ${labId === "all" ? "selected" : ""}>Semua lab</option>
                ${state.labs.map((lab) => `<option value="${lab.id}" ${labId === lab.id ? "selected" : ""}>${lab.name}</option>`).join("")}
              </select>
            </label>
          </div>
        </div>
        <div class="section-body">
          ${renderAnalyticsLineChart(series)}
          ${renderAnalyticsSummary(series)}
        </div>
      </section>
    </div>
  `;
}

function buildAnalyticsSeries(range, labId) {
  const current = parseISODate(todayISO());
  const bookings = state.bookings.filter((booking) => {
    if (["cancelled", "rejected"].includes(booking.status)) return false;
    return labId === "all" || booking.labId === labId;
  });

  if (range === "year") {
    const year = current.getFullYear();
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const label = new Date(year, index, 1).toLocaleDateString("id-ID", { month: "short" });
      return { key, label, value: 0 };
    });
    bookings.forEach((booking) => {
      const index = buckets.findIndex((bucket) => booking.date.startsWith(bucket.key));
      if (index >= 0) buckets[index].value += 1;
    });
    return analyticsSeriesResult(range, labId, buckets);
  }

  const length = range === "week" ? 7 : 30;
  const start = addDays(current, -(length - 1));
  const buckets = Array.from({ length }, (_, index) => {
    const date = dateISO(addDays(start, index));
    return { key: date, label: shortDate(date), value: 0 };
  });
  bookings.forEach((booking) => {
    const bucket = buckets.find((item) => item.key === booking.date);
    if (bucket) bucket.value += 1;
  });
  return analyticsSeriesResult(range, labId, buckets);
}

function analyticsSeriesResult(range, labId, buckets) {
  const values = buckets.map((bucket) => bucket.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(0, ...values);
  const lab = labId === "all" ? null : getLab(labId);
  return {
    range,
    labId,
    labName: lab?.name || "Semua lab",
    labels: buckets.map((bucket) => bucket.label),
    values,
    total,
    peak,
    average: values.length ? total / values.length : 0
  };
}

function renderAnalyticsLineChart(series) {
  const width = 680;
  const height = 260;
  const padding = { top: 20, right: 18, bottom: 44, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, series.peak);
  const points = series.values.map((value, index) => {
    const divisor = Math.max(1, series.values.length - 1);
    const x = padding.left + (plotWidth * index) / divisor;
    const y = padding.top + plotHeight - (plotHeight * value) / maxValue;
    return { x, y, value, label: series.labels[index] };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1).x.toFixed(1)} ${padding.top + plotHeight} L ${points[0].x.toFixed(1)} ${padding.top + plotHeight} Z`;
  const tickIndexes = chartTickIndexes(series.values.length);
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((maxValue * (4 - index)) / 4);
    const y = padding.top + (plotHeight * index) / 4;
    return `
      <line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />
      <text class="chart-y-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${value}</text>
    `;
  }).join("");

  return `
    <div class="chart-shell">
      <svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik tren peminjaman ${series.labName}">
        <g>
          ${gridLines}
          <line class="chart-axis" x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${width - padding.right}" y2="${padding.top + plotHeight}" />
          <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" />
        </g>
        <path class="chart-area" d="${areaPath}"></path>
        <path class="chart-line" d="${linePath}"></path>
        ${points.map((point) => `<circle class="chart-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4"><title>${point.label}: ${point.value} peminjaman</title></circle>`).join("")}
        ${tickIndexes.map((index) => `<text class="chart-x-label" x="${points[index].x.toFixed(1)}" y="${height - 14}" text-anchor="middle">${points[index].label}</text>`).join("")}
      </svg>
    </div>
  `;
}

function chartTickIndexes(length) {
  if (length <= 12) return Array.from({ length }, (_, index) => index);
  return [...new Set([0, Math.floor(length * 0.25), Math.floor(length * 0.5), Math.floor(length * 0.75), length - 1])];
}

function renderAnalyticsSummary(series) {
  return `
    <div class="analytics-summary">
      <div>
        <span>Filter</span>
        <strong>${series.labName}</strong>
      </div>
      <div>
        <span>Total</span>
        <strong>${series.total}</strong>
      </div>
      <div>
        <span>Tertinggi</span>
        <strong>${series.peak}</strong>
      </div>
      <div>
        <span>Rata-rata</span>
        <strong>${series.average.toFixed(1)}</strong>
      </div>
    </div>
  `;
}

function renderCalendarStrip() {
  const start = parseISODate(todayISO());
  const days = Array.from({ length: 7 }, (_, index) => {
    return dateISO(addDays(start, index));
  });
  return `
    <div class="calendar-strip">
      ${days
        .map((date) => {
          const events = calendarEventsForDate(date);
          const hasMaintenance = events.some((event) => event.type === "maintenance");
          const hasBooking = events.some((event) => event.type !== "maintenance");
          const label = calendarStripLabel(events);
          return `<button class="day-cell ${hasMaintenance ? "is-maintenance" : ""} ${hasBooking ? "is-busy" : ""}" type="button" data-calendar-date="${date}" ${events.length ? "" : "disabled"} aria-label="${label} pada ${formatDate(date)}">
            <strong>${shortDate(date)}</strong>
            <span>${label}</span>
          </button>`;
        })
        .join("")}
    </div>
  `;
}

function calendarStripLabel(events) {
  // Yang dihitung hanya kegiatan yang sudah disetujui + maintenance.
  // Pending dan tolak tidak dihitung.
  const agenda = events.filter((event) => event.type === "approved" || event.type === "maintenance").length;
  return agenda ? `${agenda} Agenda` : "Kosong";
}

function renderYearCalendar() {
  const year = Number(todayISO().slice(0, 4));
  const totalBookings = state.bookings.filter((booking) => booking.date.startsWith(`${year}-`) && ["pending", "approved"].includes(booking.status)).length;
  const totalMaintenance = state.maintenance.filter((item) => item.date.startsWith(`${year}-`)).length;
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>Kalender tahun ${year}</h2>
          <p>${totalBookings} jadwal peminjaman dan ${totalMaintenance} maintenance tercatat tahun ini.</p>
        </div>
        <div class="calendar-legend">
          <span><i class="legend-dot approved"></i>Disetujui</span>
          <span><i class="legend-dot pending"></i>Upcoming</span>
          <span><i class="legend-dot maintenance"></i>Maintenance</span>
        </div>
      </div>
      <div class="section-body">
        <div class="year-calendar">
          ${Array.from({ length: 12 }, (_, month) => renderMonthCalendar(year, month)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMonthCalendar(year, month) {
  const monthName = new Date(year, month, 1).toLocaleDateString("id-ID", { month: "long" });
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const blankDays = Array.from({ length: firstDay }, () => `<div class="month-day is-empty"></div>`).join("");
  const days = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = calendarEventsForDate(date);
    const hasMaintenance = events.some((event) => event.type === "maintenance");
    const hasBooking = events.some((event) => event.type !== "maintenance");
    const edgeClass = (firstDay + index) % 7 > 3 ? "is-right-edge" : "";
    const summary = events.length ? `${events.length} agenda pada ${formatDate(date)}` : `Tidak ada agenda pada ${formatDate(date)}`;
    const interactionAttrs = events.length ? `tabindex="0" role="button" data-calendar-date="${date}"` : `tabindex="-1"`;
    return `
      <div class="month-day ${date === todayISO() ? "is-today" : ""} ${hasBooking ? "has-booking" : ""} ${hasMaintenance ? "has-maintenance" : ""} ${events.length ? "has-events" : ""} ${edgeClass}" ${interactionAttrs} aria-label="${summary}">
        <strong>${day}</strong>
        ${events.length ? `<div class="calendar-events">${events.map(renderCalendarEvent).join("")}</div>${renderCalendarDayPopover(date, events)}` : ""}
      </div>
    `;
  }).join("");
  return `
    <article class="month-card">
      <div class="month-head">
        <h3>${monthName}</h3>
        <span>${year}</span>
      </div>
      <div class="month-grid">
        ${weekdays.map((day) => `<div class="weekday">${day}</div>`).join("")}
        ${blankDays}
        ${days}
      </div>
    </article>
  `;
}

function calendarEventsForDate(date) {
  const user = getUser();
  const isAdmin = state.session.role === "admin";
  const bookings = state.bookings
    .filter((booking) => {
      if (booking.date !== date || !["pending", "approved"].includes(booking.status)) return false;
      return isAdmin || booking.status === "approved" || booking.userId === user?.id;
    })
    .sort(byDateTime)
    .map((booking) => {
      const lab = getLab(booking.labId);
      return {
        kind: "booking",
        id: booking.id,
        date: booking.date,
        type: booking.status,
        labName: lab.name,
        labCode: lab.code,
        requester: booking.requester,
        requesterType: booking.requesterType,
        purpose: booking.purpose,
        start: booking.start,
        end: booking.end,
        timing: calendarTimingClass(booking),
        status: statusLabel(booking.status),
        time: timeRange(booking),
        text: isAdmin
          ? `${booking.start} ${lab.code} - ${booking.requester}`
          : `${booking.start} ${lab.code} - ${booking.userId === user?.id ? booking.purpose : booking.requester}`
      };
    });
  const maintenance = state.maintenance
    .filter((item) => item.date === date)
    .sort(byDateTime)
    .map((item) => {
      const lab = getLab(item.labId);
      return {
        kind: "maintenance",
        id: item.id,
        date: item.date,
        type: "maintenance",
        labName: lab.name,
        labCode: lab.code,
        requester: "Admin Laboratorium",
        requesterType: "Admin",
        purpose: item.reason,
        start: item.start,
        end: item.end,
        status: "Maintenance",
        time: timeRange(item),
        text: `${item.start} ${lab.code} - Maintenance`
      };
    });
  return [...bookings, ...maintenance];
}

function renderCalendarDayPopover(date, events) {
  const dayName = new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" });
  return `
    <div class="calendar-popover" role="tooltip">
      <div class="calendar-popover-head">
        <strong>${dayName}</strong>
        <span>${formatDate(date)}</span>
      </div>
      <div class="calendar-popover-list">
        ${events.map(renderCalendarPopoverItem).join("")}
      </div>
    </div>
  `;
}

function renderCalendarPopoverItem(event) {
  const timeBadge = event.kind === "maintenance" ? "" : (event.timing === "timing-ongoing"
    ? `<span class="calendar-popover-status is-ongoing">● Berlangsung</span>`
    : event.timing === "timing-expired"
      ? `<span class="calendar-popover-status is-expired">Kadaluarsa</span>`
      : event.timing === "timing-upcoming"
        ? `<span class="calendar-popover-status is-upcoming">Upcoming</span>`
        : "");
  return `
    <div class="calendar-popover-item ${event.type} ${event.kind === "maintenance" ? "" : event.timing || ""}">
      <span class="popover-dot"></span>
      <div>
        <strong>${event.purpose}</strong>
        <span>${event.time} - ${event.labName}</span>
        <span>${event.kind === "booking" ? `Peminjam: ${event.requester}` : `Agenda: ${event.requester}`}</span>
        ${event.kind === "maintenance" ? `<span class="calendar-popover-status">${event.status}</span>` : ""}
        ${timeBadge}
      </div>
    </div>
  `;
}

function renderCalendarEvent(event) {
  const cls = event.kind === "maintenance" ? "maintenance" : event.timing || "timing-future";
  if (event.kind === "booking") {
    return `<button class="calendar-event ${cls}" type="button" data-detail="${event.id}" title="${event.text}">${event.text}</button>`;
  }
  return `<span class="calendar-event ${cls}" title="${event.text}">${event.text}</span>`;
}

function renderBookingItem(booking) {
  const lab = getLab(booking.labId);
  const availability = checkAvailability(booking.labId, booking.date, booking.start, booking.end, booking.id);
  const isAdmin = state.session.role === "admin";
  // Admin hanya bisa membatalkan peminjaman MILIKNYA SENDIRI (dibuat lewat
  // fitur "Ajukan Peminjaman"); pengajuan user lain tetap lewat Verifikasi.
  const canCancel = booking.userId === state.session.userId &&
    ["pending", "approved"].includes(booking.status);
  const canReview = isAdmin && booking.status === "pending";
  const canPrint = !isAdmin && booking.status === "approved";
  return `
    <article class="item">
      <div class="item-main">
        <div class="item-title">
          ${lab.name}
          <span class="pill ${booking.status}">${statusLabel(booking.status)}</span>
          ${booking.status === "pending" && !availability.available ? `<span class="pill rejected">Ada konflik</span>` : ""}
        </div>
        <div class="item-meta">
          <span>${formatDate(booking.date)}</span>
          <span>${timeRange(booking)}</span>
          <span>${isAdmin ? booking.requester : booking.purpose}</span>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" data-detail="${booking.id}">${icon("search")}Detail</button>
        ${canReview ? `<button class="btn btn-primary" data-review="${booking.id}">${icon("check")}Verifikasi</button>` : ""}
        ${canCancel ? `<button class="btn btn-danger" data-cancel="${booking.id}">${icon("x")}Batalkan</button>` : ""}
        ${canPrint ? `<button class="btn btn-soft" data-letter="${booking.id}">${icon("printer")}Surat</button>` : ""}
      </div>
    </article>
  `;
}

function renderMaintenanceItem(item) {
  const lab = getLab(item.labId);
  return `
    <article class="item">
      <div class="item-main">
        <div class="item-title">
          ${lab.name}
          <span class="pill maintenance">Maintenance</span>
        </div>
        <div class="item-meta">
          <span>${formatDate(item.date)}</span>
          <span>${timeRange(item)}</span>
          <span>${item.reason}</span>
        </div>
      </div>
      ${state.session.role === "admin" ? `<div class="row-actions"><button class="btn btn-danger" data-remove-maintenance="${item.id}">${icon("trash")}Hapus</button></div>` : ""}
    </article>
  `;
}

function renderNotificationItem(notification) {
  return `
    <article class="item">
      <div class="item-main">
        <div class="item-title">
          ${notification.title}
          ${notification.unread ? `<span class="pill info">Baru</span>` : ""}
        </div>
        <div class="item-meta">
          <span>${notification.time}</span>
          <span>${notification.message}</span>
        </div>
      </div>
      <span class="pill ${notification.type || "info"}">${statusLabel(notification.type || "info")}</span>
    </article>
  `;
}

function renderBookingTable(rows, admin = false) {
  if (!rows.length) return renderEmpty("history", "Belum ada data peminjaman.");
  return `
    <div class="history-cards">
      ${rows.map((booking) => renderHistoryCard(booking, admin)).join("")}
    </div>
    <div class="table-wrap history-table">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>${admin ? "Peminjam" : "Lab"}</th>
            <th>Jadwal</th>
            <th>Tujuan</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (booking) => `
              <tr>
                <td>${booking.id}</td>
                <td>${admin ? booking.requester : getLab(booking.labId).name}</td>
                <td>${formatDate(booking.date)}<br />${timeRange(booking)}</td>
                <td>${booking.purpose}</td>
                <td><span class="pill ${booking.status}">${statusLabel(booking.status)}</span></td>
                <td>
                  <div class="row-actions">
                    <button class="btn btn-ghost" data-detail="${booking.id}">${icon("search")}Detail</button>
                    ${booking.status === "approved" && !admin ? `<button class="btn btn-soft" data-letter="${booking.id}">${icon("printer")}Surat</button>` : ""}
                    ${booking.status === "pending" && admin ? `<button class="btn btn-primary" data-review="${booking.id}">${icon("check")}Verifikasi</button>` : ""}
                  </div>
                </td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderHistoryCard(booking, admin = false) {
  const lab = getLab(booking.labId);
  return `
    <article class="history-card">
      <div class="history-card-head">
        <div>
          <span class="history-id">${booking.id}</span>
          <strong>${admin ? booking.requester : lab.name}</strong>
        </div>
        <span class="pill ${booking.status}">${statusLabel(booking.status)}</span>
      </div>
      <div class="history-card-body">
        <div>
          <span>Jadwal</span>
          <strong>${formatDate(booking.date)} ${timeRange(booking)}</strong>
        </div>
        <div>
          <span>${admin ? "Lab" : "Kegiatan"}</span>
          <strong>${admin ? lab.name : booking.purpose}</strong>
        </div>
        <div>
          <span>${admin ? "Kegiatan" : "Peminjam"}</span>
          <strong>${admin ? booking.purpose : booking.requester}</strong>
        </div>
      </div>
      <div class="row-actions history-actions">
        <button class="btn btn-ghost" data-detail="${booking.id}">${icon("search")}Detail</button>
        ${booking.status === "approved" && !admin ? `<button class="btn btn-soft" data-letter="${booking.id}">${icon("printer")}Surat</button>` : ""}
        ${booking.status === "pending" && admin ? `<button class="btn btn-primary" data-review="${booking.id}">${icon("check")}Verifikasi</button>` : ""}
      </div>
    </article>
  `;
}

function renderEmpty(iconName, text) {
  return `
    <div class="empty-state">
      <span class="icon-box">${icon(iconName)}</span>
      <strong>${text}</strong>
    </div>
  `;
}

function detailRow(label, value) {
  return `<div class="detail-row"><span>${label}</span><strong>${value || "-"}</strong></div>`;
}

function renderModal() {
  const { name, data } = state.modal;
  if (name === "detail") return renderDetailModal(data.id);
  if (name === "calendarDay") return renderCalendarDayModal(data.date);
  if (name === "review") return renderReviewModal(data.id);
  if (name === "cancel") return renderCancelModal(data.id);
  if (name === "letter") return renderLetterModal(data.id);
  return "";
}

function renderCalendarDayModal(date) {
  const events = calendarEventsForDate(date);
  const dayName = new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" });
  const expired = !isUpcomingDate(date);
  const hasOngoing = events.some((event) => eventTiming(event) === "ongoing");
  const notes = [
    hasOngoing
      ? `<div class="notice info"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><div><strong>Jadwal sedang berlangsung</strong><div>Ada agenda yang aktif saat ini. Segera cek daftar di bawah.</div></div></div>`
      : "",
    expired
      ? `<div class="notice warning">${icon("x")}<div><strong>Tanggal ini sudah terlewat (kadaluarsa)</strong><div>Informasi agenda di bawah tetap ditampilkan sebagai arsip peminjaman.</div></div></div>`
      : ""
  ].join("");
  return modalShell(
    `Agenda ${dayName}`,
    `
      <div class="calendar-day-detail">
        ${notes}
        <div class="calendar-popover-head">
          <strong>${formatDate(date)}</strong>
          <span>${events.length ? `${events.length} agenda tercatat` : "Tidak ada agenda"}</span>
        </div>
        ${events.length ? `<div class="calendar-detail-list">${events.map(renderCalendarDetailItem).join("")}</div>` : renderEmpty("calendar", "Belum ada agenda pada tanggal ini.")}
      </div>
    `,
    `<button class="btn btn-ghost" data-close-modal>Tutup</button>`
  );
}

function renderCalendarDetailItem(event) {
  const timeBadge = event.kind === "maintenance" ? "" : (event.timing === "timing-ongoing"
    ? `<span class="calendar-popover-status is-ongoing">● Berlangsung</span>`
    : event.timing === "timing-expired"
      ? `<span class="calendar-popover-status is-expired">Kadaluarsa</span>`
      : event.timing === "timing-upcoming"
        ? `<span class="calendar-popover-status is-upcoming">Upcoming</span>`
        : "");
  return `
    <article class="calendar-detail-item ${event.type} ${event.kind === "maintenance" ? "" : event.timing || ""}">
      <span class="popover-dot"></span>
      <div class="calendar-detail-content">
        <strong>${event.purpose}</strong>
        <span>${event.time} - ${event.labName}</span>
        <span>${event.kind === "booking" ? `Peminjam: ${event.requester}` : `Agenda: ${event.requester}`}</span>
        <div class="calendar-detail-actions">
          ${event.kind === "maintenance" ? `<span class="calendar-popover-status">${event.status}</span>` : ""}
          ${timeBadge}
          ${event.kind === "booking" ? `<button class="btn btn-ghost" type="button" data-detail="${event.id}">${icon("search")}Detail</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderDetailModal(id) {
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return "";
  const lab = getLab(booking.labId);
  const timing = eventTiming(booking);
  const notice = timing === "ongoing"
    ? `<div class="notice info"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><div><strong>Jadwal sedang berlangsung</strong><div>Peminjaman ini saat ini sedang berlangsung (${timeRange(booking)}).</div></div></div>`
    : timing === "expired"
      ? `<div class="notice warning">${icon("x")}<div><strong>Jadwal ini sudah terlewat (kadaluarsa)</strong><div>Informasi peminjaman tetap tersedia di bawah ini sebagai arsip.</div></div></div>`
      : "";
  return modalShell(
    "Detail peminjaman",
    `
      ${notice}
      <div class="detail-list">
        ${detailRow("ID", booking.id)}
        ${detailRow("Peminjam", booking.requester)}
        ${detailRow("Role peminjam", booking.requesterType)}
        ${detailRow("Lab", lab.name)}
        ${detailRow("Tanggal", formatDate(booking.date))}
        ${detailRow("Waktu", timeRange(booking))}
        ${detailRow("Tujuan", booking.purpose)}
        ${detailRow("Catatan", booking.notes)}
        ${detailRow("Status", statusLabel(booking.status))}
        ${detailRow("Catatan admin", booking.adminNote)}
        ${detailRow("Reminder", booking.reminder ? "Aktif" : "Belum aktif")}
      </div>
    `,
    `<button class="btn btn-ghost" data-close-modal>Tutup</button>`
  );
}

function renderReviewModal(id) {
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return "";
  const lab = getLab(booking.labId);
  const availability = checkAvailability(booking.labId, booking.date, booking.start, booking.end, booking.id);
  return modalShell(
    "Verifikasi peminjaman",
    `
      <div class="form-grid">
        <div class="notice ${availability.available ? "success" : "warning"}">
          ${icon(availability.available ? "check" : "x")}
          <div>
            <strong>${availability.available ? "Tidak ada konflik jadwal" : "Ada konflik jadwal"}</strong>
            <div>${availabilityMessage(availability)}</div>
          </div>
        </div>
        <div class="detail-list">
          ${detailRow("Peminjam", booking.requester)}
          ${detailRow("Lab", lab.name)}
          ${detailRow("Jadwal", `${formatDate(booking.date)} ${timeRange(booking)}`)}
          ${detailRow("Tujuan", booking.purpose)}
          ${detailRow("Catatan", booking.notes)}
        </div>
        <label class="field">
          <span>Catatan keputusan</span>
          <textarea id="reviewNote" placeholder="Catatan untuk user"></textarea>
        </label>
      </div>
    `,
    `
      <button class="btn btn-ghost" data-close-modal>Batal</button>
      <button class="btn btn-danger" data-reject-booking="${booking.id}">${icon("x")}Tolak</button>
      <button class="btn btn-primary" data-approve-booking="${booking.id}" ${availability.available ? "" : "disabled"}>${icon("check")}Setujui</button>
    `
  );
}

function renderCancelModal(id) {
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return "";
  return modalShell(
    "Batalkan peminjaman",
    `
      <form class="form-grid" id="cancelForm" data-booking-id="${booking.id}">
        <div class="notice warning">
          ${icon("x")}
          <div>
            <strong>${getLab(booking.labId).name}</strong>
            <div>${formatDate(booking.date)} ${timeRange(booking)}</div>
          </div>
        </div>
        <label class="field">
          <span>Alasan pembatalan</span>
          <select name="reason" required>
            <option>Jadwal kegiatan berubah</option>
            <option>Lab tidak jadi digunakan</option>
            <option>Jumlah peserta berubah</option>
            <option>Alasan mendadak lain</option>
          </select>
        </label>
        <label class="field">
          <span>Catatan</span>
          <textarea name="note" placeholder="Opsional"></textarea>
        </label>
      </form>
    `,
    `
      <button class="btn btn-ghost" data-close-modal>Tutup</button>
      <button class="btn btn-danger" data-submit-cancel="${booking.id}">${icon("x")}Konfirmasi</button>
    `
  );
}

function letterAdmin(booking) {
  // Prioritas: admin yang tercatat menyetujui peminjaman ini.
  let reviewer = booking.reviewedBy
    ? state.users.find((user) => user.id === booking.reviewedBy) || null
    : null;
  if (!reviewer && booking.reviewedByName) {
    reviewer = state.users.find((user) => user.name === booking.reviewedByName) || null;
  }
  if (!reviewer) {
    const current = getUser();
    if (current?.role === "admin") reviewer = current;
    else {
      const admins = state.users.filter((user) => user.role === "admin");
      if (admins.length === 1) reviewer = admins[0];
    }
  }
  return reviewer;
}

function renderLetterModal(id) {
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return "";
  const lab = getLab(booking.labId);
  const reviewer = letterAdmin(booking);
  const reviewerName = reviewer?.name || booking.reviewedByName || "Admin Laboratorium";
  const reviewerNip = reviewer?.nim ? `<span class="letter-sub">NIP/NIDN: ${reviewer.nim}</span>` : "";
  return modalShell(
    "Surat peminjaman",
    `
      <div class="print-letter">
        <div class="letter-box">
          <h3>Surat Izin Peminjaman Laboratorium</h3>
          <p>Nomor: ${booking.id}/LAB/NUSA/2026</p>
          <p>Yang bertanda tangan di bawah ini menyetujui peminjaman <strong>${lab.name}</strong> untuk kegiatan <strong>${booking.purpose}</strong>.</p>
          <div class="detail-list">
            ${detailRow("Peminjam", booking.requester)}
            ${detailRow("Tanggal", formatDate(booking.date))}
            ${detailRow("Waktu", timeRange(booking))}
            ${detailRow("Lokasi", lab.location)}
            ${detailRow("Catatan admin", booking.adminNote)}
          </div>
          <div class="letter-sign">
            <div><span>Peminjam</span><strong>${booking.requester}</strong></div>
            <div><span>Admin Laboratorium</span><strong>${reviewerName}${reviewerNip}</strong></div>
          </div>
        </div>
      </div>
    `,
    `
      <button class="btn btn-ghost" data-close-modal>Tutup</button>
      <button class="btn btn-primary" data-print>${icon("printer")}Cetak</button>
    `
  );
}

function modalShell(title, body, actions) {
  return `
    <div class="modal-layer" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="btn btn-ghost btn-icon" data-close-modal aria-label="Tutup">${icon("close")}</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">${actions}</div>
      </div>
    </div>
  `;
}

function renderToast() {
  const toast = state.toast;
  const type = toast.type === "error" ? "error" : toast.type === "warning" ? "warning" : "success";
  const iconName = type === "error" ? "x" : type === "warning" ? "bell" : "check";
  return `
    <div class="toast is-${type}" role="alert">
      <span class="toast-icon">${icon(iconName)}</span>
      <div class="toast-body">
        <strong>${escapeHtml(toast.title)}</strong>
        <span>${escapeHtml(toast.message)}</span>
      </div>
      <button class="toast-close" data-close-toast aria-label="Tutup pemberitahuan">${icons.x}</button>
    </div>
  `;
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function byDateTime(a, b) {
  return `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`);
}

function bindAuth() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      state.loginRole = button.dataset.role;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      saveState();
      render();
    });
  });
  document.querySelector("#loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    signIn();
  });
  document.querySelector("#registerForm")?.addEventListener("submit", registerUser);
  document.querySelector("[data-logout]")?.addEventListener("click", signOut);
}

function bindApp() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.page));
  });
  document.querySelectorAll("[data-toggle-sidebar]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mobileOpen = !state.mobileOpen;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-close-sidebar]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mobileOpen = false;
      saveState();
      render();
    });
  });
  document.querySelector("[data-logout]")?.addEventListener("click", signOut);
  document.querySelector("[data-sync]")?.addEventListener("click", syncRemoteData);
  document.querySelector("[data-close-toast]")?.addEventListener("click", () => {
    state.toast = null;
    if (toastTimer) window.clearTimeout(toastTimer);
    render();
  });
  document.querySelector("#borrowForm")?.addEventListener("submit", submitBooking);
  document.querySelector("#maintenanceForm")?.addEventListener("submit", saveMaintenance);
  document.querySelector("[data-read-notifications]")?.addEventListener("click", markNotificationsRead);
  document.querySelector("[data-check-availability]")?.addEventListener("click", () => {
    const form = document.querySelector("#borrowForm");
    const data = new FormData(form);
    document.querySelector("#availabilityResult").innerHTML = renderAvailabilityPreview(data.get("labId"), data.get("date"), data.get("start"), data.get("end"));
  });
  document.querySelector("#borrowForm")?.addEventListener("input", () => {
    const form = document.querySelector("#borrowForm");
    const data = new FormData(form);
    document.querySelector("#availabilityResult").innerHTML = renderAvailabilityPreview(data.get("labId"), data.get("date"), data.get("start"), data.get("end"));
  });
  document.querySelector("#avatarInput")?.addEventListener("change", (event) => {
    saveProfilePhoto(event.currentTarget.files?.[0]);
  });
  document.querySelector("[data-remove-avatar]")?.addEventListener("click", removeProfilePhoto);
  document.querySelectorAll("[data-calendar-date]").forEach((day) => {
    day.addEventListener("click", (event) => {
      if (event.target.closest("[data-detail]")) return;
      openModal("calendarDay", { date: day.dataset.calendarDate });
    });
    day.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key) || event.target.closest("[data-detail]")) return;
      event.preventDefault();
      openModal("calendarDay", { date: day.dataset.calendarDate });
    });
  });
  document.querySelectorAll("[data-analytics-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.analyticsRange = button.dataset.analyticsRange;
      saveState();
      render();
    });
  });
  document.querySelector("[data-analytics-lab]")?.addEventListener("change", (event) => {
    state.analyticsLabId = event.currentTarget.value;
    saveState();
    render();
  });
  document.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => openModal("detail", { id: button.dataset.detail }));
  });
  document.querySelectorAll("[data-review]").forEach((button) => {
    button.addEventListener("click", () => openModal("review", { id: button.dataset.review }));
  });
  document.querySelectorAll("[data-cancel]").forEach((button) => {
    button.addEventListener("click", () => openModal("cancel", { id: button.dataset.cancel }));
  });
  document.querySelectorAll("[data-letter]").forEach((button) => {
    button.addEventListener("click", () => openModal("letter", { id: button.dataset.letter }));
  });
  document.querySelectorAll("[data-remove-maintenance]").forEach((button) => {
    button.addEventListener("click", () => removeMaintenance(button.dataset.removeMaintenance));
  });
  bindModalEvents();
}

function bindModalEvents() {
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
  document.querySelector("[data-approve-booking]")?.addEventListener("click", (event) => {
    updateBookingStatus(event.currentTarget.dataset.approveBooking, "approved", document.querySelector("#reviewNote")?.value.trim());
  });
  document.querySelector("[data-reject-booking]")?.addEventListener("click", (event) => {
    updateBookingStatus(event.currentTarget.dataset.rejectBooking, "rejected", document.querySelector("#reviewNote")?.value.trim());
  });
  document.querySelector("[data-submit-cancel]")?.addEventListener("click", (event) => {
    const form = document.querySelector("#cancelForm");
    if (form.reportValidity()) {
      cancelBooking({ preventDefault() {}, currentTarget: form }, event.currentTarget.dataset.submitCancel);
    }
  });
  document.querySelector("[data-print]")?.addEventListener("click", () => window.print());
}

try {
  initializeApp();
} catch (error) {
  console.error("[NusaLab] Inisialisasi gagal:", error);
  state.authLoading = false;
  state.authError = error.message || "Terjadi kesalahan saat memuat aplikasi.";
  render();
}
