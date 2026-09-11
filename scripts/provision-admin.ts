import { adminServices } from '../server/admin';
const uid = process.env.FIREBASE_ADMIN_UID;
if (!uid)
  throw new Error('Set FIREBASE_ADMIN_UID to the existing Firebase Authentication user UID.');
const { auth, db } = adminServices();
const user = await auth.getUser(uid);
if (user.disabled) throw new Error('The selected user is disabled.');
await db.doc('access/admin').set({ uid });
console.log('Authorized admin updated. Client applications cannot modify this grant.');
