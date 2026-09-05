import mongoose from 'mongoose';

/**
 * Atomic sequence for order numbers, one document per year, so numbering
 * restarts at WRD-2027-0001 in January.
 *
 * Counting existing orders and adding one is the obvious alternative and it is
 * wrong: two customers checking out in the same second read the same count and
 * collide on the unique index.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export async function nextOrderNumber(date = new Date()) {
  const year = date.getFullYear();
  const doc = await Counter.findByIdAndUpdate(
    `order-${year}`,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `WRD-${year}-${String(doc.seq).padStart(4, '0')}`;
}

export default Counter;
