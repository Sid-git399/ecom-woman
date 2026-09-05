import 'dotenv/config';
import mongoose from 'mongoose';
import User from './Models/User.js';

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI missing');

await mongoose.connect(uri);

const email = 'admin@gmail.com';
const telephone = '0550000000';

const existing = await User.findOne({ $or: [{ email }, { telephone }] });

if (existing) {
  console.log('EXISTING', {
    id: String(existing._id),
    email: existing.email,
    telephone: existing.telephone,
    role: existing.role,
  });
  await mongoose.disconnect();
  process.exit(0);
}

const user = new User({
  nom: 'Administration',
  telephone,
  email,
  passwordHash: 'Pwd123456',
  role: 'ADMIN',
});

await user.save();
console.log('CREATED', {
  id: String(user._id),
  email: user.email,
  telephone: user.telephone,
  role: user.role,
});

await mongoose.disconnect();
