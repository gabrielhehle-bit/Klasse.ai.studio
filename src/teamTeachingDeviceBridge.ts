import {
  ensureRegisteredTeamTeachingDevice,
  listSharedClasses,
  listTeamTeachingSchoolUsers,
  refreshTeamTeachingMemberDevices,
} from './lib/teamTeachingService';

// A Teamteaching class key is zero-knowledge: the server cannot decrypt or copy it
// to a newly registered laptop. An already-authorized OWNER device can, however,
// safely wrap the same class key for every registered device of existing members.
// Do that automatically so a normal laptop change does not require a hidden manual
// key-refresh step in the Klassenteam UI.
let running = false;
let lastSuccessfulSweep = 0;
const MIN_SWEEP_GAP_MS = 30_000;

async function provisionKnownMemberDevices() {
  if (running || !navigator.onLine) return;
  if (Date.now() - lastSuccessfulSweep < MIN_SWEEP_GAP_MS) return;
  running = true;
  try {
    const { me } = await ensureRegisteredTeamTeachingDevice();
    const [sharedClasses, schoolUsers] = await Promise.all([
      listSharedClasses(),
      listTeamTeachingSchoolUsers(),
    ]);
    const usersById = new Map(schoolUsers.map(user => [user.userId, user] as const));
    const owned = sharedClasses.filter(room => room.myRole === 'owner');

    for (const room of owned) {
      for (const member of room.members) {
        const target = usersById.get(member.userId);
        if (!target?.devices?.length) continue;
        try {
          // The service unwraps the class key only on this already-authorized
          // browser and sends freshly wrapped copies for ALL of the member's
          // registered public device keys. Plain class data/key material never
          // reaches the server.
          await refreshTeamTeachingMemberDevices(room.id, target);
        } catch (error: any) {
          // A newly registered, not-yet-authorized device cannot perform the
          // sweep itself. The next authorized owner browser will complete it.
          if (error?.status !== 401 && error?.status !== 403) {
            console.warn('[Teamteaching] Gerätefreigabe konnte noch nicht aktualisiert werden:', error);
          }
        }
      }
    }
    lastSuccessfulSweep = Date.now();
    window.dispatchEvent(new CustomEvent('klassio:team-device-keys-refreshed', {
      detail: { userId: me.user.userId, classCount: owned.length },
    }));
  } catch (error: any) {
    // Normal for public/login pages, non-school accounts and expired sessions.
    if (error?.status !== 401 && error?.status !== 403) {
      console.warn('[Teamteaching] Automatische Gerätefreigabe noch nicht möglich:', error);
    }
  } finally {
    running = false;
  }
}

function scheduleSweep(delay = 1500) {
  window.setTimeout(() => void provisionKnownMemberDevices(), delay);
}

if (typeof window !== 'undefined') {
  scheduleSweep();
  window.addEventListener('online', () => scheduleSweep(250));
  window.addEventListener('focus', () => scheduleSweep(250));
  window.addEventListener('klassio-account-session-changed', () => scheduleSweep(500));
  // Covers the case where laptop B registers while laptop A stays open all day.
  window.setInterval(() => void provisionKnownMemberDevices(), 60_000);
}
